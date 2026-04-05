import { Controller, Get, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { email: string; name: string; id: string; role: string };
}

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getAuditLogs(@Req() req: AuthenticatedRequest) {
    if (req.user.role !== 'admin') {
      throw new UnauthorizedException('Only admins can view audit logs');
    }
    const logs = await this.auditService.getLogs();
    return logs;
  }
}
