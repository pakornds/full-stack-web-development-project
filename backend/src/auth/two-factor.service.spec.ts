import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as otplib from 'otplib';
import * as qrcode from 'qrcode';

// Mock otplib to avoid random secret generation in tests.
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'APP_NAME') return 'TestApp';
        return null;
      }),
    };

    const mockTokenService = {
      verifyToken: jest.fn(),
      issueAuthTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    prismaService = module.get(PrismaService) as any;
    configService = module.get(ConfigService) as any;
    tokenService = module.get(TokenService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('throws UnauthorizedException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.generateSecret('uid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws BadRequestException if 2FA already enabled', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        twoFactorEnabled: true,
      } as any);

      await expect(service.generateSecret('uid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('generates secret, updates user, and returns correct info payload', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        email: 'test@example.com',
        twoFactorEnabled: false,
      } as any);

      (otplib.generateSecret as jest.Mock).mockReturnValue('fake-secret');
      (otplib.generateURI as jest.Mock).mockReturnValue('otpauth://fake');
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,xxx');

      const result = await service.generateSecret('uid');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'uid' },
        data: { twoFactorSecret: 'fake-secret' },
      });

      expect(result).toEqual({
        secret: 'fake-secret',
        qrCode: 'data:image/png;base64,xxx',
        otpauthUrl: 'otpauth://fake',
      });
    });

    it('uses fallback APP_NAME if not in ConfigService', async () => {
      configService.get.mockReturnValue(undefined); // simulate no env var
      prismaService.user.findUnique.mockResolvedValue({ id: 'uid' } as any);
      (otplib.generateSecret as jest.Mock).mockReturnValue('x');
      (otplib.generateURI as jest.Mock).mockReturnValue('uri');

      await service.generateSecret('uid');
      
      expect(otplib.generateURI).toHaveBeenCalledWith({
        issuer: 'FSD-App',
        label: undefined,
        secret: 'x',
      });
    });
  });

  describe('enable', () => {
    it('throws BadRequest if no secret is established', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        twoFactorSecret: null,
      } as any);

      await expect(service.enable('uid', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequest if verification code fails', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        twoFactorSecret: 'valid-secret',
      } as any);
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: false });

      await expect(service.enable('uid', 'wrong-code')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('enables 2FA upon correct verification code', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        twoFactorSecret: 'valid-secret',
      } as any);
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: true }); // Pass OTP

      const result = await service.enable('uid', 'correct-code');

      expect(result).toEqual({ message: 'Two-factor authentication enabled successfully' });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'uid' },
        data: { twoFactorEnabled: true },
      });
    });
  });

  describe('disable', () => {
    it('throws BadRequest if 2FA completely disabled on user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        twoFactorEnabled: false,
      } as any);

      await expect(service.disable('uid', '000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequest if verification code is invalid', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      } as any);
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: false });

      await expect(service.disable('uid', '000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nullifies secrets and disables 2FA smoothly on valid code', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      } as any);
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: true });

      const result = await service.disable('uid', 'correct');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'uid' },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });
      expect(result.message).toMatch(/disabled successfully/i);
    });
  });

  describe('verifyLogin', () => {
    it('throws Unauthorized if tempToken is outright bogus or expired', async () => {
      tokenService.verifyToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.verifyLogin('bad-temp', 'code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws Unauthorized if payload purpose is not 2fa-login', async () => {
      tokenService.verifyToken.mockReturnValue({
        purpose: 'wrong-purpose',
        id: 'uid',
      });

      await expect(service.verifyLogin('valid-temp', 'code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws Unauthorized if user in token is deleted or no secret generated', async () => {
      tokenService.verifyToken.mockReturnValue({
        purpose: '2fa-login',
        id: 'uid',
      });
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyLogin('valid-temp', 'code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws Unauthorized on bad strictly provided OTP code', async () => {
      tokenService.verifyToken.mockReturnValue({ purpose: '2fa-login', id: 'uid' });
      prismaService.user.findUnique.mockResolvedValue({
        id: 'uid',
        twoFactorSecret: 'sec',
      } as any);
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: false }); // OTP mismatch

      await expect(service.verifyLogin('valid-temp', 'invalid-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('verifies login properly formatting DB and returning auth tokens payload', async () => {
      const dbUser = { id: 'uid', twoFactorSecret: 'sec', role: { name: 'USER' } };
      tokenService.verifyToken.mockReturnValue({ purpose: '2fa-login', id: 'uid' });
      prismaService.user.findUnique.mockResolvedValue(dbUser as any);
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: true }); // OTP match
      
      const authTokens = { accessToken: 'x', refreshToken: 'y', user: {} as any };
      tokenService.issueAuthTokens.mockResolvedValue(authTokens);

      const result = await service.verifyLogin('valid-temp', 'valid-code');
      
      expect(result).toEqual(authTokens);
      // Assure DB cleans up login lockout
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: dbUser.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      // Emits auth
      expect(tokenService.issueAuthTokens).toHaveBeenCalledWith(dbUser);
    });
  });
});
