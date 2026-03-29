import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService, RolesGuard],
})
export class LeaveModule {}
