import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
// It only runs on routes explicitly decorated with @UseGuards(AuthGuard('jwt'))
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      //passport-jwt
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          const data = (request as { cookies?: { jwt?: string } } | null)
            ?.cookies?.jwt; // It reads the jwt value from the incoming cookie (made available by cookie-parser in main.ts).
          if (!data) {
            return null;
          }
          return data;
        },
      ]),
      ignoreExpiration: false, // enables expiry checking
      // The secret is a private key used to sign and verify JWT tokens. When you call jwtService.sign(payload),
      // NestJS uses it to cryptographically sign the token. When a request comes in, the JwtStrategy uses
      // the same secret to verify the token hasn't been tampered with. If the secrets don't match,
      // the token is rejected. Without it, anyone could forge tokens.

      secretOrKey: configService.get<string>('JWT_SECRET') || 'secret',
    });
  }
  // takes the already verified payload and turns it into the req.user
  async validate(payload: any) {
    return this.authService.validateAccessPayload(payload);
  }
}
