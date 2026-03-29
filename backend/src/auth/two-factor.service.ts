import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { AuthResult, TempTokenPayload } from './types';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────

  private async findUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private verifyOtp(code: string, secret: string): boolean {
    return verifySync({ token: code, secret }).valid;
  }

  // ─── Public Methods ────────────────────────────────────────

  async generateSecret(userId: string) {
    const user = await this.findUserOrThrow(userId);

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    const secret = generateSecret();
    const appName = this.configService.get<string>('APP_NAME') || 'FSD-App';
    const otpauthUrl = generateURI({
      issuer: appName,
      label: user.email,
      secret,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const qrCode = await qrcode.toDataURL(otpauthUrl);

    return { secret, qrCode, otpauthUrl };
  }

  async enable(userId: string, code: string) {
    const user = await this.findUserOrThrow(userId);

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Generate a 2FA secret first');
    }

    if (!this.verifyOtp(code, user.twoFactorSecret)) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disable(userId: string, code: string) {
    const user = await this.findUserOrThrow(userId);

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    if (!this.verifyOtp(code, user.twoFactorSecret)) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { message: 'Two-factor authentication disabled successfully' };
  }

  async verifyLogin(tempToken: string, code: string): Promise<AuthResult> {
    let payload: TempTokenPayload;

    try {
      payload = this.tokenService.verifyToken<TempTokenPayload>(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }

    if (payload.purpose !== '2fa-login') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      include: { role: true },
    });

    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('User not found or 2FA not configured');
    }

    if (!this.verifyOtp(code, user.twoFactorSecret)) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Reset failed login attempts on successful 2FA
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    return this.tokenService.issueAuthTokens(user);
  }
}
