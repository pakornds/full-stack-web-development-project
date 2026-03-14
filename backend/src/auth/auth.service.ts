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
import PocketBase from 'pocketbase';
import { createHmac, randomUUID } from 'node:crypto';

import { RegisterDto, LoginDto } from './dto/auth.dto';

// The MAX_FAILED_LOGIN_ATTEMPTS + 1 failed attempt triggers the lock
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;

// For Type Checking
// TypeScript don't pull DB schema
interface PocketBaseUserRecord {
  id: string;
  email: string;
  name: string;
  role?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  currentSessionId?: string | null;
  refreshTokenHash?: string | null;
  refreshTokenExpiresAt?: string | null;
}

interface AuthTokenPayload {
  email: string;
  sub: string;
  pocketbaseId: string;
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

interface PocketBaseOAuthRecord {
  id: string;
  email: string;
  name: string;
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private createPocketBaseClient() {
    return new PocketBase(
      this.configService.get<string>('PB_URL') || 'http://127.0.0.1:8090',
    );
  }

  private async getAdminClient() {
    const adminPb = this.createPocketBaseClient();

    try {
      await adminPb
        .collection('_superusers')
        .authWithPassword(
          this.configService.get<string>('PB_ADMIN_EMAIL') ||
            'admin@example.com',
          this.configService.get<string>('PB_ADMIN_PASSWORD') ||
            'adminpassword',
        );
    } catch (err) {
      console.warn(
        'Could not authenticate PB admin. Make sure PB_ADMIN_EMAIL/PASSWORD are correct and the admin is created.',
      );
      throw new InternalServerErrorException(
        'PocketBase admin authentication failed',
      );
    }

    return adminPb;
  }

  private getJwtSecret() {
    return this.configService.get<string>('JWT_SECRET') || 'secret';
  }

  private getAccessTokenTtl() {
    return this.configService.get<number>('ACCESS_TOKEN_TTL_SECONDS') ?? 15 * 60;
  }

  private getRefreshTokenTtl() {
    return (
      this.configService.get<number>('REFRESH_TOKEN_TTL_SECONDS') ??
      7 * 24 * 60 * 60
    );
  }

  private hashRefreshToken(token: string) {
    const hashSecret =
      this.configService.get<string>('REFRESH_TOKEN_HASH_SECRET') ||
      this.getJwtSecret();
    return createHmac('sha256', hashSecret).update(token).digest('hex');
  }

  private createTokenPayload(
    user: Pick<PocketBaseUserRecord, 'email' | 'name' | 'id' | 'role'>,
    sessionId: string,
  ): AuthTokenPayload {
    return {
      email: user.email,
      sub: user.name,
      pocketbaseId: user.id,
      role: user.role || 'user',
      sessionId,
    };
  }

  private getUserResponse(user: PocketBaseUserRecord) {
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

  private async revokeSession(adminPb: PocketBase, userId: string) {
    await adminPb.collection('users').update(userId, {
      currentSessionId: null,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }

  private async issueAuthTokens(
    adminPb: PocketBase,
    user: PocketBaseUserRecord,
  ): Promise<AuthResult> {
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

    await adminPb.collection('users').update(user.id, {
      currentSessionId: sessionId,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
      refreshTokenExpiresAt: this.getRefreshTokenExpiryDate(refreshToken),
    });

    return {
      accessToken,
      refreshToken,
      user: this.getUserResponse(user),
    };
  }

  private async getUserById(adminPb: PocketBase, userId: string) {
    try {
      return await adminPb.collection('users').getOne<PocketBaseUserRecord>(userId);
    } catch (err: any) {
      if (err?.status === 404 || err?.response?.code === 404) {
        return null;
      }

      throw err;
    }
  }

  private isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<AuthTokenPayload>;
    return (
      typeof candidate.pocketbaseId === 'string' &&
      typeof candidate.sessionId === 'string' &&
      typeof candidate.email === 'string' &&
      typeof candidate.sub === 'string' &&
      typeof candidate.role === 'string'
    );
  }

  private getFailedLoginAttempts(record: Partial<PocketBaseUserRecord>) {
    return Number(record.failedLoginAttempts ?? 0);
  }

  private getLockedUntil(record: Partial<PocketBaseUserRecord>) {
    if (!record.lockedUntil) {
      return null;
    }

    const lockedUntil = new Date(record.lockedUntil);
    return Number.isNaN(lockedUntil.getTime()) ? null : lockedUntil;
  }

  private getLockoutMessage(lockedUntil: Date) {
    const remainingMinutes = Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - Date.now()) / 60000),
    );

    return `Too many failed login attempts. Try again in ${remainingMinutes} minute(s).`;
  }

  private async findUserByEmail(adminPb: PocketBase, email: string) {
    const normalizedEmail = email.replace(/"/g, '\\"');

    try {
      return await adminPb
        .collection('users')
        .getFirstListItem<PocketBaseUserRecord>(`email="${normalizedEmail}"`); // exactly one matching record instead of returning a whole list normally with normal fetch
    } catch (err: any) {
      if (err?.status === 404 || err?.response?.code === 404) {
        return null;
      }

      throw err;
    }
  }

  private async resetFailedLoginAttempts(adminPb: PocketBase, userId: string) {
    await adminPb.collection('users').update(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  private async recordFailedLoginAttempt(
    adminPb: PocketBase,
    userRecord: PocketBaseUserRecord,
  ) {
    const nextFailedLoginAttempts = this.getFailedLoginAttempts(userRecord) + 1;
    const lockedUntil =
      nextFailedLoginAttempts > MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOGIN_LOCK_DURATION_MS)
        : null;

    await adminPb.collection('users').update(userRecord.id, {
      failedLoginAttempts: nextFailedLoginAttempts,
      lockedUntil: lockedUntil?.toISOString() ?? null,
    });

    return {
      failedLoginAttempts: nextFailedLoginAttempts,
      lockedUntil,
    };
  }

  async pocketbaseLogin(record: PocketBaseOAuthRecord) {
    if (!record?.email) {
      throw new InternalServerErrorException('Invalid record from PocketBase');
    }

    try {
      const adminPb = await this.getAdminClient();
      const role: string = record.role || 'user';
      return this.issueAuthTokens(adminPb, {
        id: record.id,
        email: record.email,
        name: record.name,
        role,
      });
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException(
        'Failed to process PocketBase login',
      );
    }
  }

  async register(userDto: RegisterDto) {
    try {
      const adminPb = await this.getAdminClient();

      const pbUser = await adminPb.collection('users').create({
        email: userDto.email,
        name: userDto.name,
        password: userDto.password,
        passwordConfirm: userDto.password,
        role: 'user', // Required by database migration
        failedLoginAttempts: 0,
        lockedUntil: null,
        emailVisibility: true,
      });

      const role: string = (pbUser as any).role || 'user';
      return this.issueAuthTokens(adminPb, {
        id: pbUser.id,
        email: pbUser.email,
        name: pbUser.name,
        role,
      });
    } catch (err: any) {
      console.error(err);
      const fieldErrors = err?.response?.data;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const messages = Object.entries(fieldErrors)
          .map(
            ([field, detail]: [string, any]) =>
              `${field}: ${detail?.message ?? detail}`,
          )
          .join('; ');
        throw new BadRequestException(messages);
      }
      throw new BadRequestException(
        err?.response?.message ||
          'Failed to register user. Email might be in use.',
      );
    }
  }

  async login(loginDto: LoginDto) {
    // main branch: security audit log
    console.log(
      `[main] Security audit - login request received for: ${loginDto.email}`,
    );

    const adminPb = await this.getAdminClient();
    const userRecord = await this.findUserByEmail(adminPb, loginDto.email);

    if (userRecord) {
      const lockedUntil = this.getLockedUntil(userRecord);

      // exits immediately and does not attempt auth
      if (lockedUntil && lockedUntil > new Date()) {
        throw new HttpException(
          this.getLockoutMessage(lockedUntil),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      //clear an expired lock
      if (lockedUntil) {
        await this.resetFailedLoginAttempts(adminPb, userRecord.id);
      }
    }

    try {
      const userAuthPb = this.createPocketBaseClient(); // Avoids cross-request contamination (Async race condition)
      const authData = await userAuthPb
        .collection('users')
        .authWithPassword(loginDto.email, loginDto.password);

      const pbUser = authData.record;

      if (userRecord) {
        await this.resetFailedLoginAttempts(adminPb, userRecord.id);
      }

      const role: string = (pbUser as any).role || 'user';
      return this.issueAuthTokens(adminPb, {
        id: pbUser.id,
        email: pbUser.email,
        name: pbUser.name,
        role,
      });
    } catch (err: any) {
      console.error(err);
      if (err?.status === 400 || err?.response?.code === 400) {
        if (userRecord) {
          // incredment failed attempt
          const { lockedUntil } = await this.recordFailedLoginAttempt(
            adminPb,
            userRecord,
          );

          // throw the first time it happens
          if (lockedUntil) {
            throw new HttpException(
              this.getLockoutMessage(lockedUntil),
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
        }
        // returned for known auth failure from PocketBase (status 400).
        throw new UnauthorizedException('Invalid email or password');
      }
      // generic fallback for unexpected errors
      throw new UnauthorizedException('Login failed. Please try again.');
    }
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

    const adminPb = await this.getAdminClient();
    const user = await this.getUserById(adminPb, payload.pocketbaseId);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const isSessionActive =
      user.currentSessionId && user.currentSessionId === payload.sessionId;
    const isRefreshHashValid =
      user.refreshTokenHash &&
      user.refreshTokenHash === this.hashRefreshToken(refreshToken);
    const refreshExpiry = user.refreshTokenExpiresAt
      ? new Date(user.refreshTokenExpiresAt)
      : null;
    const isRefreshNotExpired =
      !!refreshExpiry && !Number.isNaN(refreshExpiry.getTime())
        ? refreshExpiry > new Date()
        : false;

    if (!isSessionActive || !isRefreshHashValid || !isRefreshNotExpired) {
      await this.revokeSession(adminPb, user.id);
      throw new UnauthorizedException('Refresh token revoked or invalid');
    }

    return this.issueAuthTokens(adminPb, user);
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

    if (!payload?.pocketbaseId) {
      return;
    }

    const adminPb = await this.getAdminClient();
    const user = await this.getUserById(adminPb, payload.pocketbaseId);
    if (!user) {
      return;
    }

    const isSessionActive =
      user.currentSessionId && user.currentSessionId === payload.sessionId;
    const isRefreshHashValid =
      user.refreshTokenHash &&
      user.refreshTokenHash === this.hashRefreshToken(refreshToken);

    if (isSessionActive && isRefreshHashValid) {
      await this.revokeSession(adminPb, user.id);
    }
  }

  async validateAccessPayload(payload: unknown) {
    if (!this.isAuthTokenPayload(payload)) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    const adminPb = await this.getAdminClient();
    const user = await this.getUserById(adminPb, payload.pocketbaseId);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (!user.currentSessionId || user.currentSessionId !== payload.sessionId) {
      throw new UnauthorizedException('Session revoked or expired');
    }

    return {
      email: user.email,
      name: user.name,
      pocketbaseId: user.id,
      role: user.role || 'user',
      sessionId: user.currentSessionId,
    };
  }
}
