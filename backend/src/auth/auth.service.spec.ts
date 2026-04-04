import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, HttpException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';

jest.mock('argon2');
jest.mock('nodemailer');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let tokenService: jest.Mocked<TokenService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      leaveType: {
        findMany: jest.fn(),
      },
      leaveQuota: {
        upsert: jest.fn(),
      },
    };

    const mockTokenService = {
      issueAuthTokens: jest.fn(),
      issueTempToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      verifyRefreshTokenIgnoringExpiry: jest.fn(),
      hashRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      isAuthTokenPayload: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TokenService, useValue: mockTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as any;
    tokenService = module.get(TokenService) as any;
    configService = module.get(ConfigService) as any;

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-05T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('oauthLogin', () => {
    it('should throw Error if no email', async () => {
      await expect(service.oauthLogin({} as any)).rejects.toThrow(InternalServerErrorException);
    });

    it('should login existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@example.com' } as any);
      tokenService.issueAuthTokens.mockResolvedValue('tokens' as any);

      const result = await service.oauthLogin({ email: 'test@example.com', name: 'Test' });
      expect(result).toBe('tokens');
      expect(tokenService.issueAuthTokens).toHaveBeenCalledWith({ id: 'u1', email: 'test@example.com' });
    });

    it('should create new user with default role if does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'r1' } as any);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'test@example.com' } as any);
      prisma.leaveType.findMany.mockResolvedValue([{ id: 'lt1', defaultDays: 10 }] as any);
      tokenService.issueAuthTokens.mockResolvedValue('tokens' as any);

      await service.oauthLogin({ email: 'test@example.com', name: 'Test' });

      expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { name: 'employee' } });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com', name: 'Test', password: '', roleId: 'r1' },
        include: { role: true },
      });
      expect(prisma.leaveQuota.upsert).toHaveBeenCalled();
    });

    it('should create default role if not exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(null);
      prisma.role.create.mockResolvedValue({ id: 'r2' } as any);
      prisma.user.create.mockResolvedValue({ id: 'u1' } as any);
      prisma.leaveType.findMany.mockResolvedValue([]);
      
      await service.oauthLogin({ email: 'new@example.com', name: 'New' });
      expect(prisma.role.create).toHaveBeenCalledWith({ data: { name: 'employee' } });
    });

    it('should handle leaveType error gracefully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'r1' } as any);
      prisma.user.create.mockResolvedValue({ id: 'u1' } as any);
      prisma.leaveType.findMany.mockRejectedValue(new Error('DB Error'));

      await service.oauthLogin({ email: 'test@example.com', name: 'Test' });
      expect(tokenService.issueAuthTokens).toHaveBeenCalled();
    });
    
    it('should throw InternalServerErrorException for unexpected errors', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('Unexpected'));
      await expect(service.oauthLogin({ email: 'test@example.com', name: 'Test' })).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('register', () => {
    it('should throw if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({} as any);
      await expect(service.register({ email: 'test@test.com', password: '123', name: 'Test' })).rejects.toThrow(BadRequestException);
    });

    it('should register successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.role.findUnique.mockResolvedValue({ id: 'role1' } as any);
      prisma.user.create.mockResolvedValue({ id: 'u1' } as any);
      prisma.leaveType.findMany.mockResolvedValue([]);
      tokenService.issueAuthTokens.mockResolvedValue('tokens' as any);

      const result = await service.register({ email: 'test@test.com', password: '123', name: 'Test' });
      expect(result).toBe('tokens');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'test@test.com', name: 'Test', password: 'hashed', roleId: 'role1' },
        include: { role: true },
      });
    });

    it('should rethrow unexpected errors', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB Error'));
      await expect(service.register({ email: 'test@test.com', password: '123', name: 'Test' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'test@test.com', password: '123' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if account locked', async () => {
      const futureLock = new Date(Date.now() + 60000);
      prisma.user.findUnique.mockResolvedValue({ lockedUntil: futureLock } as any);
      await expect(service.login({ email: 'test@test.com', password: '123' })).rejects.toThrow(HttpException);
    });

    it('should clear lock if expired', async () => {
      const pastLock = new Date(Date.now() - 60000);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', lockedUntil: pastLock, failedLoginAttempts: 6, password: 'hashed' } as any);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      tokenService.issueAuthTokens.mockResolvedValue('tokens' as any);

      await service.login({ email: 'test@test.com', password: '123' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    });

    it('should record failed attempt if password invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', failedLoginAttempts: 1, password: 'hashed' } as any);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: 'test@test.com', password: '123' })).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 2, lockedUntil: null },
      });
    });

    it('should lockout if too many failed attempts', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', failedLoginAttempts: 5, password: 'hashed' } as any);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: 'test@test.com', password: '123' })).rejects.toThrow(HttpException);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 6, lockedUntil: expect.any(Date) },
      });
    });

    it('should login, reset attempts, and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hashed', twoFactorEnabled: false } as any);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      tokenService.issueAuthTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as any);

      const result = await service.login({ email: 'test@test.com', password: '123' });
      expect(result).toEqual({ requiresTwoFactor: false, accessToken: 'a', refreshToken: 'r' });
    });

    it('should login, reset attempts, and return temp tokens for 2FA', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hashed', twoFactorEnabled: true } as any);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      tokenService.issueTempToken.mockReturnValue('tmpToken');

      const result = await service.login({ email: 'test@test.com', password: '123' });
      expect(result).toEqual({ requiresTwoFactor: true, tempToken: 'tmpToken' });
    });
  });

  describe('refresh', () => {
    it('should throw if invalid token', async () => {
      tokenService.verifyRefreshToken.mockImplementation(() => { throw new Error(); });
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user not found', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ id: 'u1' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if validation fails', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ id: 'u1', sessionId: 's1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        currentSessionId: 's2', // Invalid session
        refreshTokenHash: 'hash',
        refreshTokenExpiresAt: new Date(Date.now() + 10000)
      } as any);
      tokenService.hashRefreshToken.mockReturnValue('hash');
      
      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
      expect(tokenService.revokeSession).toHaveBeenCalledWith('u1');
    });

    it('should renew token successfully', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ id: 'u1', sessionId: 's1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        currentSessionId: 's1',
        refreshTokenHash: 'hash',
        refreshTokenExpiresAt: new Date(Date.now() + 10000)
      } as any);
      tokenService.hashRefreshToken.mockReturnValue('hash');
      tokenService.issueAuthTokens.mockResolvedValue('newTokens' as any);

      const result = await service.refresh('token');
      expect(result).toBe('newTokens');
    });
  });

  describe('logout', () => {
    it('should just return if no token', async () => {
      await service.logout(null);
      expect(tokenService.verifyRefreshTokenIgnoringExpiry).not.toHaveBeenCalled();
    });

    it('should return if payload invalid', async () => {
      tokenService.verifyRefreshTokenIgnoringExpiry.mockImplementation(() => { throw new Error(); });
      await service.logout('badToken');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should retrieve user and revoke session', async () => {
      tokenService.verifyRefreshTokenIgnoringExpiry.mockReturnValue({ id: 'u1', sessionId: 's1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', currentSessionId: 's1', refreshTokenHash: 'hash' } as any);
      tokenService.hashRefreshToken.mockReturnValue('hash');
      
      await service.logout('validToken');
      expect(tokenService.revokeSession).toHaveBeenCalledWith('u1');
    });
    
    it('should return if payload missing id', async () => {
      tokenService.verifyRefreshTokenIgnoringExpiry.mockReturnValue({} as any);
      await service.logout('token');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return if user not found', async () => {
      tokenService.verifyRefreshTokenIgnoringExpiry.mockReturnValue({ id: 'u1' });
      prisma.user.findUnique.mockResolvedValue(null);
      await service.logout('token');
      expect(tokenService.revokeSession).not.toHaveBeenCalled();
    });
  });

  describe('validateAccessPayload', () => {
    it('should throw if payload invalid', async () => {
      tokenService.isAuthTokenPayload.mockReturnValue(false);
      await expect(service.validateAccessPayload({})).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user not found', async () => {
      tokenService.isAuthTokenPayload.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateAccessPayload({ id: 'u1' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if session revoked', async () => {
      tokenService.isAuthTokenPayload.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', currentSessionId: 's1', role: { name: 'emp' } } as any);
      await expect(service.validateAccessPayload({ id: 'u1', sessionId: 's2' })).rejects.toThrow(UnauthorizedException);
    });

    it('should return user record', async () => {
      tokenService.isAuthTokenPayload.mockReturnValue(true);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', email: 'test@example.com', name: 'Test', role: { name: 'emp' }, departmentId: 'd1', currentSessionId: 's1', twoFactorEnabled: false
      } as any);
      
      const res = await service.validateAccessPayload({ id: 'u1', sessionId: 's1' });
      expect(res).toEqual({
        email: 'test@example.com', name: 'Test', id: 'u1', role: 'emp', departmentId: 'd1', sessionId: 's1', twoFactorEnabled: false
      });
    });
  });

  describe('forgotPassword', () => {
    it('should return mock success if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await service.forgotPassword('test@example.com');
      expect(res).toEqual({ message: 'If this email exists, a reset link has been sent.' });
    });

    it('should generate token, update user, and send email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' } as any);
      configService.get.mockImplementation((k: string) => k === 'SMTP_HOST' ? 'smtp' : null);
      
      const mockTransporter = { sendMail: jest.fn().mockResolvedValue({ messageId: 'm1' }) };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
      
      const res = await service.forgotPassword('test@example.com');
      expect(res).toEqual({ message: 'If this email exists, a reset link has been sent.' });
      
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          resetPasswordToken: expect.any(String),
          resetPasswordExpiresAt: expect.any(Date),
        }
      });
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should catch email error and still return success', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' } as any);
      configService.get.mockImplementation((k: string) => k === 'SMTP_HOST' ? 'smtp' : null);
      const mockTransporter = { sendMail: jest.fn().mockRejectedValue(new Error('SMTP error')) };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

      const res = await service.forgotPassword('test@example.com');
      expect(res).toEqual({ message: 'If this email exists, a reset link has been sent.' });
    });

    it('should use ethereal when SMTP_HOST is not set', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' } as any);
      configService.get.mockReturnValue(false); // No smtp host
      (nodemailer.createTestAccount as jest.Mock).mockResolvedValue({ user: 'u', pass: 'p' });
      const mockTransporter = { sendMail: jest.fn().mockResolvedValue({ messageId: 'm1' }) };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

      await service.forgotPassword('test@example.com');
      expect(nodemailer.createTestAccount).toHaveBeenCalled();
    });

    it('should use provided SMTP when SMTP_HOST is set', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' } as any);
      configService.get.mockImplementation((k: string) => k === 'SMTP_HOST' ? 'smtp.custom.com' : null);
      const mockTransporter = { sendMail: jest.fn().mockResolvedValue({ messageId: 'm1' }) };
      (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

      await service.forgotPassword('test@example.com');
      expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.custom.com' }));
    });
  });

  describe('resetPassword', () => {
    it('should throw if token invalid', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword('t', 'newp')).rejects.toThrow(BadRequestException);
    });

    it('should throw if token expired', async () => {
      prisma.user.findFirst.mockResolvedValue({ resetPasswordExpiresAt: new Date(Date.now() - 1000) } as any);
      await expect(service.resetPassword('t', 'newp')).rejects.toThrow(BadRequestException);
    });

    it('should reset password', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', resetPasswordExpiresAt: new Date(Date.now() + 60000) } as any);
      (argon2.hash as jest.Mock).mockResolvedValue('newHash');

      const res = await service.resetPassword('t', 'newp');
      expect(res).toEqual({ message: 'Password has been reset successfully.' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          password: 'newHash',
          resetPasswordToken: null,
          resetPasswordExpiresAt: null,
          currentSessionId: null,
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        }
      });
    });
  });
});
