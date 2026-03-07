import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import PocketBase from 'pocketbase';

import { RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private pb: PocketBase;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.pb = new PocketBase(
      this.configService.get<string>('PB_URL') || 'http://127.0.0.1:8090',
    );
  }

  private async getAdminAuth() {
    try {
      await this.pb.admins.authWithPassword(
        this.configService.get<string>('PB_ADMIN_EMAIL') || 'admin@example.com',
        this.configService.get<string>('PB_ADMIN_PASSWORD') || 'adminpassword',
      );
    } catch (err) {
      console.warn(
        'Could not authenticate PB admin. Make sure PB_ADMIN_EMAIL/PASSWORD are correct and the admin is created.',
      );
    }
  }

  async pocketbaseLogin(record: any) {
    if (!record || !record.email) {
      throw new InternalServerErrorException('Invalid record from PocketBase');
    }

    try {
      const payload = {
        email: record.email,
        sub: record.name,
        pocketbaseId: record.id,
      };
      return {
        accessToken: this.jwtService.sign(payload),
        user: {
          id: record.id,
          email: record.email,
          name: record.name,
        },
      };
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException(
        'Failed to process PocketBase login',
      );
    }
  }

  async register(userDto: RegisterDto) {
    try {
      await this.getAdminAuth();

      const pbUser = await this.pb.collection('users').create({
        email: userDto.email,
        name: userDto.name,
        password: userDto.password,
        passwordConfirm: userDto.password,
        role: 'user', // Required by database migration
        emailVisibility: true,
      });

      const payload = {
        email: pbUser.email,
        sub: pbUser.name,
        pocketbaseId: pbUser.id,
      };
      return {
        accessToken: this.jwtService.sign(payload),
        user: {
          id: pbUser.id,
          email: pbUser.email,
          name: pbUser.name,
        },
      };
    } catch (err: any) {
      console.error(err);
      throw new BadRequestException(
        err?.response?.message ||
          'Failed to register user. Email might be in use.',
      );
    }
  }
}
