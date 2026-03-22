import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  Post,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { RegisterDto, LoginDto, PocketbaseOAuthDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

interface AuthenticatedRequest extends Request {
  user: {
    email: string;
    name: string;
    pocketbaseId: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    });
  }

  private clearAuthCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/auth',
    });
  }

  @Post('google/pocketbase')
  async googlePocketbaseAuth(
    @Body() body: PocketbaseOAuthDto,
    @Res() res: Response,
  ) {
    const inputRecord: unknown = body.record;
    if (!inputRecord || typeof inputRecord !== 'object') {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Invalid PocketBase record' });
    }

    const raw = inputRecord as Record<string, unknown>;
    const record = {
      id: typeof raw.id === 'string' ? raw.id : '',
      email: typeof raw.email === 'string' ? raw.email : '',
      name: typeof raw.name === 'string' ? raw.name : '',
      role: typeof raw.role === 'string' ? raw.role : undefined,
    };

    if (!record.id || !record.email || !record.name) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Invalid PocketBase record' });
    }

    const { accessToken, refreshToken, user } =
      await this.authService.pocketbaseLogin(record);

    this.setAuthCookies(res, accessToken, refreshToken);

    return res
      .status(HttpStatus.OK)
      .json({ user, message: 'Google OAuth via PocketBase successful' });
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt')) // This triggers the JwtStrategy. If the cookie is missing, expired, or tampered with, Passport rejects the request with 401 Unauthorized. If valid, the decoded payload is placed on req.user
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
      message:
        'You are authenticated with high security using JWT and HttpOnly cookies',
    };
  }

  @Get('dashboard/admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getAdminDashboard(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
      stats: {
        description: 'Full system access',
        permissions: ['manage_users', 'view_logs', 'system_config'],
      },
      message: 'Welcome to the Admin Dashboard',
    };
  }

  @Get('dashboard/manager')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('manager')
  getManagerDashboard(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
      stats: {
        description: 'Manager access',
        permissions: ['view_logs', 'api_access', 'debug_mode'],
        apiUptime: process.uptime().toFixed(2) + 's',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      message: 'Welcome to the Manager Dashboard',
    };
  }

  @Get('dashboard/employee')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employee')
  getEmployeeDashboard(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
      stats: {
        description: 'Standard user access',
        permissions: ['view_profile', 'edit_profile'],
      },
      message: 'Welcome to your Dashboard',
    };
  }

  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const refreshToken =
      typeof req.cookies?.refreshToken === 'string'
        ? req.cookies.refreshToken
        : undefined;

    await this.authService.logout(refreshToken);
    this.clearAuthCookies(res);
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Logged out successfully' });
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(body);

    this.setAuthCookies(res, accessToken, refreshToken);

    return res
      .status(HttpStatus.OK)
      .json({ user, message: 'Logged in successfully' });
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken =
      typeof req.cookies?.refreshToken === 'string'
        ? req.cookies.refreshToken
        : undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const {
      accessToken,
      refreshToken: nextRefreshToken,
      user,
    } = await this.authService.refresh(refreshToken);

    this.setAuthCookies(res, accessToken, nextRefreshToken);

    return res
      .status(HttpStatus.OK)
      .json({ user, message: 'Token refreshed successfully' });
  }

  @Post('register')
  async register(@Body() body: RegisterDto, @Res() res: Response) {
    const { accessToken, refreshToken, user } =
      await this.authService.register(body);

    this.setAuthCookies(res, accessToken, refreshToken);

    return res
      .status(HttpStatus.CREATED)
      .json({ user, message: 'Registered successfully' });
  }
}
