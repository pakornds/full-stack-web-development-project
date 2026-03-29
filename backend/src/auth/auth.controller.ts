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
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

interface AuthenticatedRequest extends Request {
  user: { email: string; name: string; id: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Cookie Helpers ────────────────────────────────────────

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

  // ─── OAuth ─────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { email: string; name: string; role?: string };

    if (!user) {
      return res.redirect(
        `${this.configService.get('FRONTEND_URL')}/login?error=GoogleAuthFailed`,
      );
    }

    const { accessToken, refreshToken } = await this.authService.oauthLogin({
      email: user.email,
      name: user.name,
      role: user.role,
    });

    this.setAuthCookies(res, accessToken, refreshToken);
    return res.redirect(
      `${this.configService.get('FRONTEND_URL')}/dashboard/personal`,
    );
  }

  // ─── Profile & Dashboards ─────────────────────────────────

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
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

  @Get('dashboard/hr')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('hr')
  getHrDashboard(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
      stats: {
        description: 'HR access',
        permissions: [
          'view_profile',
          'edit_profile',
          'manage_department_leave',
          'approve_leave',
        ],
      },
      message: 'Welcome to the HR Dashboard',
    };
  }

  @Get('dashboard/employee')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employee', 'hr', 'admin')
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

  // ─── Auth Actions ──────────────────────────────────────────

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(body);

    if (result.requiresTwoFactor) {
      return res.status(HttpStatus.OK).json({
        requiresTwoFactor: true,
        tempToken: result.tempToken,
        message: 'Please enter your 2FA code',
      });
    }

    this.setAuthCookies(res, result.accessToken!, result.refreshToken!);

    return res
      .status(HttpStatus.OK)
      .json({ user: result.user, message: 'Logged in successfully' });
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
}
