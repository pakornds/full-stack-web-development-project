import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthTokenPayload,
  TempTokenPayload,
  AuthResult,
  UserWithRole,
  toUserResponse,
} from './types';

const TEMP_TOKEN_TTL_SECONDS = 5 * 60;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || 'secret';
  }

  getRefreshTokenSecret(): string {
    return (
      this.configService.get<string>('REFRESH_TOKEN_HASH_SECRET') ||
      this.getJwtSecret()
    );
  }

  private getAccessTokenTtl(): number {
    return (
      this.configService.get<number>('ACCESS_TOKEN_TTL_SECONDS') ?? 15 * 60
    );
  }

  private getRefreshTokenTtl(): number {
    return (
      this.configService.get<number>('REFRESH_TOKEN_TTL_SECONDS') ??
      7 * 24 * 60 * 60
    );
  }

  hashRefreshToken(token: string): string {
    const hashSecret = this.getRefreshTokenSecret();
    return createHmac('sha256', hashSecret).update(token).digest('hex');
  }

  private createPayload(
    user: UserWithRole,
    sessionId: string,
  ): AuthTokenPayload {
    return {
      email: user.email,
      sub: user.name,
      id: user.id,
      role: user.role.name,
      sessionId,
    };
  }

  private getRefreshTokenExpiryDate(token: string): Date {
    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    if (!decoded?.exp) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    return new Date(decoded.exp * 1000);
  }

  // ─── Token Operations ──────────────────────────────────────

  async issueAuthTokens(user: UserWithRole): Promise<AuthResult> {
    const sessionId = randomUUID();
    const payload = this.createPayload(user, sessionId);

    const accessToken = this.jwtService.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.getAccessTokenTtl(),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getRefreshTokenSecret(),
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
      user: toUserResponse(user),
    };
  }

  issueTempToken(user: User): string {
    const payload: TempTokenPayload = {
      sub: user.email,
      id: user.id,
      purpose: '2fa-login',
    };

    return this.jwtService.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: TEMP_TOKEN_TTL_SECONDS,
    });
  }

  verifyToken<T extends object>(token: string): T {
    return this.jwtService.verify<T>(token, {
      secret: this.getJwtSecret(),
    });
  }

  verifyTokenIgnoringExpiry<T extends object>(token: string): T {
    return this.jwtService.verify<T>(token, {
      secret: this.getJwtSecret(),
      ignoreExpiration: true,
    });
  }

  verifyRefreshToken<T extends object>(token: string): T {
    return this.jwtService.verify<T>(token, {
      secret: this.getRefreshTokenSecret(),
    });
  }

  verifyRefreshTokenIgnoringExpiry<T extends object>(token: string): T {
    return this.jwtService.verify<T>(token, {
      secret: this.getRefreshTokenSecret(),
      ignoreExpiration: true,
    });
  }

  // ─── Session Operations ────────────────────────────────────

  async revokeSession(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentSessionId: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
    if (!value || typeof value !== 'object') return false;

    const candidate = value as Partial<AuthTokenPayload>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.sessionId === 'string' &&
      typeof candidate.email === 'string' &&
      typeof candidate.sub === 'string' &&
      typeof candidate.role === 'string'
    );
  }
}
