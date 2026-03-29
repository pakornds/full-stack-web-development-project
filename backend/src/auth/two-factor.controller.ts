import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TwoFactorService } from './two-factor.service';
import { VerifyTwoFactorDto, TwoFactorLoginDto } from './dto/two-factor.dto';
import type { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; name: string; role: string };
}

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

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

  @Post('verify-login')
  async verifyLogin(@Body() body: TwoFactorLoginDto, @Res() res: Response) {
    const { accessToken, refreshToken, user } =
      await this.twoFactorService.verifyLogin(body.tempToken, body.code);

    this.setAuthCookies(res, accessToken, refreshToken);

    return res
      .status(HttpStatus.OK)
      .json({ user, message: 'Logged in successfully with 2FA' });
  }

  @Post('generate')
  @UseGuards(AuthGuard('jwt'))
  async generate(@Req() req: AuthenticatedRequest) {
    return this.twoFactorService.generateSecret(req.user.id);
  }

  @Post('enable')
  @UseGuards(AuthGuard('jwt'))
  async enable(
    @Req() req: AuthenticatedRequest,
    @Body() body: VerifyTwoFactorDto,
  ) {
    return this.twoFactorService.enable(req.user.id, body.code);
  }

  @Post('disable')
  @UseGuards(AuthGuard('jwt'))
  async disable(
    @Req() req: AuthenticatedRequest,
    @Body() body: VerifyTwoFactorDto,
  ) {
    return this.twoFactorService.disable(req.user.id, body.code);
  }
}
