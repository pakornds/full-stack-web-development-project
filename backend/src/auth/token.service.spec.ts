import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn(),
      decode: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        if (key === 'REFRESH_TOKEN_HASH_SECRET') return 'test-refresh-secret';
        if (key === 'ACCESS_TOKEN_TTL_SECONDS') return 900; // 15 mins
        if (key === 'REFRESH_TOKEN_TTL_SECONDS') return 604800; // 7 days
        return null;
      }),
    };

    const mockPrismaService = {
      user: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService) as any;
    configService = module.get(ConfigService) as any;
    prismaService = module.get(PrismaService) as any;
  });

  describe('configuration methods', () => {
    it('getJwtSecret returns secret from config or fallback', () => {
      expect(service.getJwtSecret()).toBe('test-jwt-secret');
      configService.get.mockReturnValueOnce(undefined);
      expect(service.getJwtSecret()).toBe('secret'); // Default fallback
    });

    it('getRefreshTokenSecret returns secret or defaults to jwt secret', () => {
      expect(service.getRefreshTokenSecret()).toBe('test-refresh-secret');
      configService.get.mockImplementation(key => key === 'JWT_SECRET' ? 'test-jwt' : undefined);
      expect(service.getRefreshTokenSecret()).toBe('test-jwt');
    });
  });

  describe('hashRefreshToken', () => {
    it('should hash a text token returning a hex digest', () => {
      const token = 'my-token';
      const result = service.hashRefreshToken(token);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // Consistency check:
      expect(service.hashRefreshToken(token)).toEqual(result);
    });
  });

  describe('issueAuthTokens', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@kmitl.io',
      name: 'Test User',
      role: { name: 'ADMIN' },
    } as any;

    it('creates payloads, signs JWTs, and updates user session returning AuthResult', async () => {
      jwtService.sign.mockReturnValueOnce('access-token-123') // At first call
                     .mockReturnValueOnce('refresh-token-456'); // At second call

      // Decode is used for getting payload exp to set refresh token DB expiry
      jwtService.decode.mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 60 });

      const result = await service.issueAuthTokens(mockUser);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.decode).toHaveBeenCalledWith('refresh-token-456');
      
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          currentSessionId: expect.any(String),
          refreshTokenHash: expect.any(String),
          refreshTokenExpiresAt: expect.any(Date),
        }),
      });

      expect(result).toEqual({ // Verify AuthResult format
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'ADMIN' },
      });
    });

    it('getRefreshTokenExpiryDate defaults mapping to +7 days if decode returns no exp', async () => {
      jwtService.sign.mockReturnValue('token');
      jwtService.decode.mockReturnValue(null); // Force missing exp behaviour

      await service.issueAuthTokens(mockUser);
      // It executes, we just verify it doesn't crash from null reference
      expect(prismaService.user.update).toHaveBeenCalled();
    });
    
    it('uses fallback TTL values from config if undefined', async () => {
      configService.get.mockReturnValue(undefined); // All configs return undefined
      jwtService.sign.mockReturnValue('token');
      jwtService.decode.mockReturnValue({ exp: 1234567890 });

      await service.issueAuthTokens(mockUser);
      // Validates `getAccessTokenTtl` and `getRefreshTokenTtl` default fallback triggered.
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ expiresIn: 15 * 60 }));
    });
  });

  describe('issueTempToken', () => {
    it('returns a JWT string for 2FA tracking', () => {
      jwtService.sign.mockReturnValue('temp-token');
      const result = service.issueTempToken({ id: '1', email: 'a@a.com' } as any);

      expect(result).toBe('temp-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'a@a.com', id: '1', purpose: '2fa-login' },
        { secret: 'test-jwt-secret', expiresIn: 300 }
      );
    });
  });

  describe('verification wrappers', () => {
    it('verifyToken passes through', () => {
      service.verifyToken('tkn');
      expect(jwtService.verify).toHaveBeenCalledWith('tkn', { secret: 'test-jwt-secret' });
    });

    it('verifyTokenIgnoringExpiry applies ignore flag', () => {
      service.verifyTokenIgnoringExpiry('tkn');
      expect(jwtService.verify).toHaveBeenCalledWith('tkn', { secret: 'test-jwt-secret', ignoreExpiration: true });
    });

    it('verifyRefreshToken relies on refresh secret', () => {
      service.verifyRefreshToken('r-tkn');
      expect(jwtService.verify).toHaveBeenCalledWith('r-tkn', { secret: 'test-refresh-secret' });
    });

    it('verifyRefreshTokenIgnoringExpiry utilizes options proper', () => {
      service.verifyRefreshTokenIgnoringExpiry('r-tkn');
      expect(jwtService.verify).toHaveBeenCalledWith('r-tkn', { secret: 'test-refresh-secret', ignoreExpiration: true });
    });
  });

  describe('revokeSession', () => {
    it('nullifies session fields in Prisma', async () => {
      await service.revokeSession('999');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '999' },
        data: { currentSessionId: null, refreshTokenHash: null, refreshTokenExpiresAt: null },
      });
    });
  });

  describe('isAuthTokenPayload', () => {
    it('returns false for primitives or null', () => {
      expect(service.isAuthTokenPayload(null)).toBe(false);
      expect(service.isAuthTokenPayload(123)).toBe(false);
      expect(service.isAuthTokenPayload('fake')).toBe(false);
    });

    it('returns false for incomplete payloads', () => {
      expect(service.isAuthTokenPayload({ id: '1', sub: 'john' })).toBe(false); // Missing sessionId, email, role
    });

    it('returns true for fully shaped token payload', () => {
      expect(service.isAuthTokenPayload({
        id: '1', sessionId: 'sess', email: 'j@a.com', sub: 'john', role: 'ADMIN'
      })).toBe(true);
    });
  });
});
