import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { randomUUID, createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import {
  AuthTokenPayload,
  AuthResult,
  LoginResult,
  OAuthRecord,
} from './types';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Account Lockout Helpers ───────────────────────────────

  private getLockoutMessage(lockedUntil: Date): string {
    const remainingMinutes = Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - Date.now()) / 60000),
    );
    return `Too many failed login attempts. Try again in ${remainingMinutes} minute(s).`;
  }

  private async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  private async recordFailedAttempt(userId: string, currentAttempts: number) {
    const nextAttempts = currentAttempts + 1;
    const lockedUntil =
      nextAttempts > MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOGIN_LOCK_DURATION_MS)
        : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: nextAttempts, lockedUntil },
    });

    return { failedLoginAttempts: nextAttempts, lockedUntil };
  }

  private checkAccountLock(lockedUntil: Date | null): void {
    if (lockedUntil?.getTime() > Date.now()) {
      throw new HttpException(
        this.getLockoutMessage(lockedUntil),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // Helper to get the default "employee" role id
  private async getDefaultRoleId(): Promise<string> {
    let role = await this.prisma.role.findUnique({
      where: { name: 'employee' },
    });
    role ??= await this.prisma.role.create({ data: { name: 'employee' } });
    return role.id;
  }

  // Helper to assign default leave quotas for new users
  private async assignDefaultLeaveQuotas(userId: string): Promise<void> {
    try {
      const leaveTypes = await this.prisma.leaveType.findMany();
      if (leaveTypes.length === 0) {
        console.warn(
          `[assignDefaultLeaveQuotas] No leave types found to assign quotas for user ${userId}`,
        );
        return;
      }

      const currentYear = new Date().getFullYear();

      for (const type of leaveTypes) {
        await this.prisma.leaveQuota.upsert({
          where: {
            userId_leaveTypeId_year: {
              userId,
              leaveTypeId: type.id,
              year: currentYear,
            },
          },
          update: {},
          create: {
            userId,
            leaveTypeId: type.id,
            year: currentYear,
            totalDays: type.defaultDays,
            usedDays: 0,
          },
        });
      }
      console.log(
        `[assignDefaultLeaveQuotas] Successfully created quotas for user ${userId}`,
      );
    } catch (error) {
      console.error(
        `[assignDefaultLeaveQuotas] Failed to create quotas for user ${userId}:`,
        error,
      );
    }
  }

  // ─── Auth Methods ──────────────────────────────────────────

  async oauthLogin(record: OAuthRecord): Promise<AuthResult> {
    if (!record?.email) {
      throw new InternalServerErrorException('Invalid OAuth record');
    }

    try {
      let user = await this.prisma.user.findUnique({
        where: { email: record.email },
        include: { role: true },
      });

      if (!user) {
        const roleId = await this.getDefaultRoleId();
        user = await this.prisma.user.create({
          data: {
            email: record.email,
            name: record.name,
            password: '',
            roleId,
          },
          include: { role: true },
        });
        await this.assignDefaultLeaveQuotas(user.id);
      }

      return this.tokenService.issueAuthTokens(user);
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to process OAuth login');
    }
  }

  async register(userDto: RegisterDto): Promise<AuthResult> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('User with this email already exists.');
      }

      const isBreached = await this.isPasswordBreached(userDto.password);
      if (isBreached) {
        throw new BadRequestException(
          'Password has been found in a data breach. Please choose a different password.',
        );
      }

      const hashedPassword = await argon2.hash(userDto.password);
      const roleId = await this.getDefaultRoleId();

      const user = await this.prisma.user.create({
        data: {
          email: userDto.email,
          name: userDto.name,
          password: hashedPassword,
          roleId,
        },
        include: { role: true },
      });

      await this.assignDefaultLeaveQuotas(user.id);

      return this.tokenService.issueAuthTokens(user);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      console.error(err);
      throw new BadRequestException('Failed to register user.');
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    console.log(
      `[main] Security audit - login request received for: ${loginDto.email}`,
    );

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check account lock
    this.checkAccountLock(user.lockedUntil);

    // If expired lock, reset
    if (user.lockedUntil) {
      await this.resetFailedAttempts(user.id);
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    // Verify password
    const isValidPassword = await argon2.verify(
      user.password,
      loginDto.password,
    );

    if (!isValidPassword) {
      const { lockedUntil } = await this.recordFailedAttempt(
        user.id,
        user.failedLoginAttempts,
      );

      if (lockedUntil) {
        throw new HttpException(
          this.getLockoutMessage(lockedUntil),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    await this.resetFailedAttempts(user.id);

    // If 2FA is enabled, return a temporary token instead
    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        tempToken: this.tokenService.issueTempToken(user),
      };
    }

    const authResult = await this.tokenService.issueAuthTokens(user);
    return { requiresTwoFactor: false, ...authResult };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload: AuthTokenPayload;

    try {
      payload =
        this.tokenService.verifyRefreshToken<AuthTokenPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const isSessionActive = user.currentSessionId === payload.sessionId;
      const isRefreshNotValid =
        user.refreshTokenHash !==
        this.tokenService.hashRefreshToken(refreshToken);
      const isExpired =
        user.refreshTokenExpiresAt == null ||
        Number.isNaN(user.refreshTokenExpiresAt.getTime()) ||
        user.refreshTokenExpiresAt <= new Date();

      if (!isSessionActive || isRefreshNotValid || isExpired) {
      await this.tokenService.revokeSession(user.id);
      throw new UnauthorizedException('Refresh token revoked or invalid');
    }

    return this.tokenService.issueAuthTokens(user);
  }

  async logout(refreshToken?: string | null): Promise<{ email?: string }> {
    if (!refreshToken) return {};

    let payload: AuthTokenPayload | null = null;
    try {
      payload =
        this.tokenService.verifyRefreshTokenIgnoringExpiry<AuthTokenPayload>(
          refreshToken,
        );
    } catch {
      return {};
    }

    if (!payload?.id) return {};

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) return {};

    const isSessionActive = user.currentSessionId === payload.sessionId;
    const isRefreshValid =
      user.refreshTokenHash ===
      this.tokenService.hashRefreshToken(refreshToken);

    if (isSessionActive && isRefreshValid) {
      await this.tokenService.revokeSession(user.id);
    }

    return { email: user.email };
  }

  async validateAccessPayload(payload: unknown) {
    if (!this.tokenService.isAuthTokenPayload(payload)) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (user.currentSessionId !== payload.sessionId) {
      throw new UnauthorizedException('Session revoked or expired');
    }

    return {
      email: user.email,
      name: user.name,
      id: user.id,
      role: user.role.name,
      departmentId: user.departmentId,
      sessionId: user.currentSessionId,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    let transporter: nodemailer.Transporter;

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    if (smtpHost) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT') || 465,
        secure: this.configService.get<string>('SMTP_SECURE') !== 'false',
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
        port: 465,
        secure: true,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      } as nodemailer.TransportOptions);
    }

    const info = (await transporter.sendMail({
      from: '"Leave Management System" <noreply@leave.com>',
      to: email,
      subject: 'Password Reset Token',
      text: `You requested a password reset. Your reset token is: ${token}\n\nEnter this token on the password reset page.`,
      html: `<p>You requested a password reset.</p><p>Your reset token is: <strong>${token}</strong></p><p>Enter this token on the password reset page.</p>`,
    })) as { messageId: string };

    console.log(
      `\n========= EMAIL SENT =========\nMessage sent: ${info.messageId}`,
    );
    if (smtpHost) {
      console.log(`==============================\n`);
    } else {
      console.log(
        `Preview URL: ${nodemailer.getTestMessageUrl(info as Parameters<typeof nodemailer.getTestMessageUrl>[0])}\n==============================\n`,
      );
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
      !user?.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const isBreached = await this.isPasswordBreached(newPassword);
    if (isBreached) {
      throw new BadRequestException(
        'Password has been found in a data breach. Please choose a different password.',
      );
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

    return {
      message: 'Password has been reset successfully.',
      email: user.email,
    };
  }

  private async isPasswordBreached(password: string): Promise<boolean> {
    const hash = createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    try {
      const response = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix}`,
      );
      if (!response.ok) {
        return false;
      }
      const data = await response.text();
      const lines = data.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith(suffix)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('HIPB API error:', error);
      return false; // Return false if the API is down
    }
  }
}
