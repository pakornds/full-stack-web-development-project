import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { AuthController } from './auth.controller';
import { TwoFactorController } from './two-factor.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'secret',
        signOptions: {
          expiresIn:
            configService.get<number>('ACCESS_TOKEN_TTL_SECONDS') ?? 15 * 60,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    TokenService,
    TwoFactorService,
    JwtStrategy,
    GoogleStrategy,
    RolesGuard,
  ],
  controllers: [AuthController, TwoFactorController],
})
export class AuthModule {}
