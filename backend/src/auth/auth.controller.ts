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
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: { email: string; name: string; id: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Cookie Helpers ────────────────────────────────────────

  private setAuthCookies(
    res: Response, // This is the object used to send data back to the client
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
  // Retrieve the current logged-in user's profile information, specifically their role and department.
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { department: true },
    });
    return {
      user: {
        ...req.user,
        department: {
          id: user?.department?.id,
          name: user?.department?.name,
        },
      },
      message: 'You are authenticated',
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

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto, @Res() res: Response) {
    const response = await this.authService.forgotPassword(body.email);
    return res.status(HttpStatus.OK).json(response);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto, @Res() res: Response) {
    const response = await this.authService.resetPassword(
      body.token,
      body.newPassword,
    );
    this.clearAuthCookies(res); // Clear any existing sessions when resetting
    return res.status(HttpStatus.OK).json(response);
  }
}
