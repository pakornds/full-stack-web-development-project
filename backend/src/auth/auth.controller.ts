import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  Post,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { RegisterDto, LoginDto, PocketbaseOAuthDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('google/pocketbase')
  async googlePocketbaseAuth(
    @Body() body: PocketbaseOAuthDto,
    @Res() res: Response,
  ) {
    const record = body.record;
    if (!record) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Invalid PocketBase record' });
    }

    const { accessToken, user } =
      await this.authService.pocketbaseLogin(record);

    // Set cookie
    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res
      .status(HttpStatus.OK)
      .json({ user, message: 'Google OAuth via PocketBase successful' });
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt')) // This triggers the JwtStrategy. If the cookie is missing, expired, or tampered with, Passport rejects the request with 401 Unauthorized. If valid, the decoded payload is placed on req.user
  getProfile(@Req() req: any) {
    return {
      user: req.user,
      message:
        'You are authenticated with high security using JWT and HttpOnly cookies',
    };
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Logged out successfully' });
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const { accessToken, user } = await this.authService.login(body);

    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res
      .status(HttpStatus.OK)
      .json({ user, message: 'Logged in successfully' });
  }

  @Post('register')
  async register(@Body() body: RegisterDto, @Res() res: Response) {
    const { accessToken, user } = await this.authService.register(body);

    res.cookie('jwt', accessToken, {
      httpOnly: true, // JavaScript in the browser cannot read it — only the browser sends it automatically on each request.
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res
      .status(HttpStatus.CREATED)
      .json({ user, message: 'Registered successfully' });
  }
}
