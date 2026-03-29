import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { createHmac, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { User } from '@prisma/client';

// The MAX_FAILED_LOGIN_ATTEMPTS + 1 failed attempt triggers the lock
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;

interface AuthTokenPayload {
  email: string;
  sub: string;
  id: string; // User ID
  role: string;
  sessionId: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getJwtSecret() {
    return this.configService.get<string>('JWT_SECRET') || 'secret';
  }

  private getAccessTokenTtl() {
    return (
      this.configService.get<number>('ACCESS_TOKEN_TTL_SECONDS') ?? 15 * 60 // 15 mintues
    );
  }

  private getRefreshTokenTtl() {
    return (
      this.configService.get<number>('REFRESH_TOKEN_TTL_SECONDS') ??
      7 * 24 * 60 * 60 // 7 days
    );
  }

  private hashRefreshToken(token: string) {
    const hashSecret =
      this.configService.get<string>('REFRESH_TOKEN_HASH_SECRET') ||
      this.getJwtSecret();
    return createHmac('sha256', hashSecret).update(token).digest('hex');
  }

  private createTokenPayload(
    user: Pick<User, 'email' | 'name' | 'id' | 'role'>,
    sessionId: string,
  ): AuthTokenPayload {
    return {
      email: user.email,
      sub: user.name,
      id: user.id,
      role: user.role || 'employee',
      sessionId,
    };
  }

  private getUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private getRefreshTokenExpiryDate(token: string) {
    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    if (!decoded?.exp) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    return new Date(decoded.exp * 1000);
  }

  private async revokeSession(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentSessionId: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  private async issueAuthTokens(user: User): Promise<AuthResult> {
    const sessionId = randomUUID();
    const payload = this.createTokenPayload(user, sessionId);

    const accessToken = this.jwtService.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.getAccessTokenTtl(),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.getRefreshTokenTtl(),
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        currentSessionId: sessionId,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        refreshTokenExpiresAt: this.getRefreshTokenExpiryDate(refreshToken),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.getUserResponse(user),
    };
  }

  private isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<AuthTokenPayload>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.sessionId === 'string' &&
      typeof candidate.email === 'string' &&
      typeof candidate.sub === 'string' &&
      typeof candidate.role === 'string'
    );
  }

  private getLockoutMessage(lockedUntil: Date) {
    const remainingMinutes = Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - Date.now()) / 60000),
    );

    return `Too many failed login attempts. Try again in ${remainingMinutes} minute(s).`;
  }

  private async resetFailedLoginAttempts(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  private async recordFailedLoginAttempt(user: User) {
    const nextFailedLoginAttempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      nextFailedLoginAttempts > MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOGIN_LOCK_DURATION_MS)
        : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: nextFailedLoginAttempts,
        lockedUntil,
      },
    });

    return {
      failedLoginAttempts: nextFailedLoginAttempts,
      lockedUntil,
    };
  }

  async oauthLogin(record: { email: string; name: string; role?: string }) {
    if (!record?.email) {
      throw new InternalServerErrorException('Invalid OAuth record');
    }

    try {
      let user = await this.prisma.user.findUnique({
        where: { email: record.email },
      });

      if (!user) {
        // If OAuth user doesn't exist, create them
        user = await this.prisma.user.create({
          data: {
            email: record.email,
            name: record.name,
            password: '', // OAuth users might not have a password
            role: record.role || 'employee',
          },
        });
      }

      return this.issueAuthTokens(user);
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to process OAuth login');
    }
  }

  async register(userDto: RegisterDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('User with this email already exists.');
      }

      const hashedPassword = await argon2.hash(userDto.password); // argon2id

      const user = await this.prisma.user.create({
        data: {
          email: userDto.email,
          name: userDto.name,
          password: hashedPassword,
          role: 'employee',
        },
      });

      return this.issueAuthTokens(user);
    } catch (err: any) {
      console.error(err);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException('Failed to register user.');
    }
  }

  async login(loginDto: LoginDto) {
    console.log(
      `[main] Security audit - login request received for: ${loginDto.email}`,
    );

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException(
        this.getLockoutMessage(user.lockedUntil),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.lockedUntil) {
      await this.resetFailedLoginAttempts(user.id);
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    const { password } = user;
    const isValidPassword = await argon2.verify(password, loginDto.password);

    if (!isValidPassword) {
      const { lockedUntil } = await this.recordFailedLoginAttempt(user);

      if (lockedUntil) {
        throw new HttpException(
          this.getLockoutMessage(lockedUntil),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    await this.resetFailedLoginAttempts(user.id);

    return this.issueAuthTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload: AuthTokenPayload;

    try {
      payload = this.jwtService.verify<AuthTokenPayload>(refreshToken, {
        secret: this.getJwtSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const isSessionActive =
      user.currentSessionId && user.currentSessionId === payload.sessionId;
    const isRefreshHashValid =
      user.refreshTokenHash &&
      user.refreshTokenHash === this.hashRefreshToken(refreshToken);
    const refreshExpiry = user.refreshTokenExpiresAt;
    const isRefreshNotExpired =
      !!refreshExpiry && !Number.isNaN(refreshExpiry.getTime())
        ? refreshExpiry > new Date()
        : false;

    if (!isSessionActive || !isRefreshHashValid || !isRefreshNotExpired) {
      await this.revokeSession(user.id);
      throw new UnauthorizedException('Refresh token revoked or invalid');
    }

    return this.issueAuthTokens(user);
  }

  async logout(refreshToken?: string | null) {
    if (!refreshToken) {
      return;
    }

    let payload: AuthTokenPayload | null = null;
    try {
      payload = this.jwtService.verify<AuthTokenPayload>(refreshToken, {
        secret: this.getJwtSecret(),
        ignoreExpiration: true,
      });
    } catch {
      return;
    }

    if (!payload?.id) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });
    if (!user) {
      return;
    }

    const isSessionActive =
      user.currentSessionId && user.currentSessionId === payload.sessionId;
    const isRefreshHashValid =
      user.refreshTokenHash &&
      user.refreshTokenHash === this.hashRefreshToken(refreshToken);

    if (isSessionActive && isRefreshHashValid) {
      await this.revokeSession(user.id);
    }
  }

  async validateAccessPayload(payload: unknown) {
    if (!this.isAuthTokenPayload(payload)) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (!user.currentSessionId || user.currentSessionId !== payload.sessionId) {
      throw new UnauthorizedException('Session revoked or expired');
    }

    return {
      email: user.email,
      name: user.name,
      id: user.id,
      role: user.role || 'employee',
      sessionId: user.currentSessionId,
    };
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    let transporter: nodemailer.Transporter;

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    if (smtpHost) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT') || 587,
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      } as nodemailer.TransportOptions);
    } else {
      // Create an ethereal test account for development if no SMTP config is present
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      } as nodemailer.TransportOptions);
    }

    const info = await transporter.sendMail({
      from: '"Your App Name" <noreply@example.com>',
      to: email,
      subject: 'Password Reset Token',
      text: `You requested a password reset. Your reset token is: ${token}\n\nEnter this token on the password reset page.`,
      html: `<p>You requested a password reset.</p><p>Your reset token is: <strong>${token}</strong></p><p>Enter this token on the password reset page.</p>`,
    });

    console.log(
      `\n========= EMAIL SENT =========\nMessage sent: ${info.messageId}`,
    );
    if (!smtpHost) {
      console.log(
        `Preview URL: ${nodemailer.getTestMessageUrl(info)}\n==============================\n`,
      );
    } else {
      console.log(`==============================\n`);
    }
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user doesn't exist to prevent enumeration
      return { message: 'If this email exists, a reset link has been sent.' };
    }

    const resetToken = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    // Send the email with the token (runs asynchronously in background usually, but here we wait to ensure it handles)
    try {
      await this.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      // Even if email fails, we shouldn't expose that the user exists/does not exist, just log it.
    }

    return { message: 'If this email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
      },
    });

    if (
      !user ||
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
        currentSessionId: null, // Force logout
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return { message: 'Password has been reset successfully.' };
  }
}
