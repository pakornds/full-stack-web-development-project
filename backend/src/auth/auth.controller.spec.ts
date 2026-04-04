import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException, HttpStatus } from '@nestjs/common';
import { RegisterDto, LoginDto } from './dto/auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockAuthService = {
      oauthLogin: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return null;
      }),
    };

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as any;
    configService = module.get(ConfigService) as any;
    prismaService = module.get(PrismaService) as any;
  });

  const mockResponse = () => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
  };

  describe('googleAuthRedirect', () => {
    it('should redirect to error if no user provided', async () => {
      const res = mockResponse();
      await controller.googleAuthRedirect({ user: null } as any, res as any);
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/login?error=GoogleAuthFailed');
    });

    it('should login and set cookies if user exists', async () => {
      const req = { user: { email: 'test@example.com', name: 'Test', role: 'employee' } };
      const res = mockResponse();
      authService.oauthLogin.mockResolvedValue({ accessToken: 'accToken', refreshToken: 'refToken', user: {} as any });
      
      await controller.googleAuthRedirect(req as any, res as any);

      expect(authService.oauthLogin).toHaveBeenCalledWith(req.user);
      expect(res.cookie).toHaveBeenCalledWith('jwt', 'accToken', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refToken', expect.any(Object));
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/dashboard/personal');
    });
  });

  describe('getProfile', () => {
    it('should return user profile with department', async () => {
      const req = { user: { id: 'u1', email: 'test@example.com', name: 'Test', role: 'employee' } };
      prismaService.user.findUnique.mockResolvedValue({ id: 'u1', department: { id: 'd1', name: 'Dept' } } as any);

      const result = await controller.getProfile(req as any);
      expect(result).toEqual({
        user: { ...req.user, department: { id: 'd1', name: 'Dept' } },
        message: 'You are authenticated',
      });
    });
  });

  describe('login', () => {
    it('should return 2FA requirement', async () => {
      const res = mockResponse();
      authService.login.mockResolvedValue({ requiresTwoFactor: true, tempToken: 'tmp' });

      await controller.login({ email: 'test@test.com', password: 'password' }, res as any);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({
        requiresTwoFactor: true,
        tempToken: 'tmp',
        message: 'Please enter your 2FA code',
      });
    });

    it('should login and set cookies', async () => {
      const res = mockResponse();
      authService.login.mockResolvedValue({ requiresTwoFactor: false, accessToken: 'accToken', refreshToken: 'refToken', user: {} as any });

      await controller.login({ email: 'test@test.com', password: 'password' }, res as any);
      expect(res.cookie).toHaveBeenCalledWith('jwt', 'accToken', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refToken', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({
        user: {},
        message: 'Logged in successfully',
      });
    });
  });

  describe('register', () => {
    it('should register and set cookies', async () => {
      const res = mockResponse();
      authService.register.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: {} as any });
      
      await controller.register({ email: 'test@test.com', password: 'password', name: 'Test' }, res as any);
      expect(res.cookie).toHaveBeenCalledWith('jwt', 'a', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'r', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    });
  });

  describe('refresh', () => {
    it('should throw Unauthorized if no refresh token', async () => {
      const req = { cookies: {} };
      const res = mockResponse();
      await expect(controller.refresh(req as any, res as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh and set cookies', async () => {
      const req = { cookies: { refreshToken: 'r' } };
      const res = mockResponse();
      authService.refresh.mockResolvedValue({ accessToken: 'newA', refreshToken: 'newR', user: {} as any });

      await controller.refresh(req as any, res as any);
      expect(authService.refresh).toHaveBeenCalledWith('r');
      expect(res.cookie).toHaveBeenCalledWith('jwt', 'newA', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'newR', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });

  describe('logout', () => {
    it('should clear cookies and call logout', async () => {
      const req = { cookies: { refreshToken: 'r' } };
      const res = mockResponse();

      await controller.logout(req as any, res as any);
      expect(authService.logout).toHaveBeenCalledWith('r');
      expect(res.clearCookie).toHaveBeenCalledWith('jwt', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });

    it('should clear cookies and call logout with undefined if no cookie', async () => {
      const req = { cookies: {} };
      const res = mockResponse();

      await controller.logout(req as any, res as any);
      expect(authService.logout).toHaveBeenCalledWith(undefined);
      expect(res.clearCookie).toHaveBeenCalledWith('jwt', expect.any(Object));
    });
  });

  describe('googleAuth', () => {
    it('should call googleAuth', async () => {
      expect(await controller.googleAuth()).toBeUndefined();
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword and return 200', async () => {
      const dto = { email: 'test@example.com' } as any;
      const res = mockResponse();
      authService.forgotPassword.mockResolvedValue({ message: 'Password reset link sent' } as any);

      await controller.forgotPassword(dto, res as any);
      expect(authService.forgotPassword).toHaveBeenCalledWith(dto.email);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password reset link sent' });
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword, clear cookies and return 200', async () => {
      const dto = { token: 'token123', newPassword: 'new-password' } as any;
      const res = mockResponse();
      authService.resetPassword.mockResolvedValue({ message: 'Password updated' } as any);

      await controller.resetPassword(dto, res as any);
      expect(authService.resetPassword).toHaveBeenCalledWith(dto.token, dto.newPassword);
      expect(res.clearCookie).toHaveBeenCalledWith('jwt', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password updated' });
    });
  });

});
