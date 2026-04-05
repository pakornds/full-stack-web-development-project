import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LeaveService } from './leave.service';
interface AuthenticatedRequest {
  user: { id: string; email: string; name: string; role: string };
}

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // ─── Leave Types ──────────────────────────────────────────

  @Get('types')
  async getLeaveTypes() {
    return this.leaveService.getLeaveTypes();
  }

  // ─── Personal Leave Dashboard ─────────────────────────────

  @Get('personal')
  async getPersonalLeave(@Req() req: AuthenticatedRequest) {
    return this.leaveService.getPersonalLeave(req.user.id);
  }

  @Get('personal/:userId')
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin')
  async getPersonalLeaveForUser(@Param('userId') userId: string) {
    return this.leaveService.getPersonalLeave(userId);
  }

  // ─── Department Leave Dashboard (HR / Admin) ──────────────

  @Get('department')
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin')
  async getDepartmentLeave(@Req() req: AuthenticatedRequest) {
    return this.leaveService.getDepartmentLeave(req.user.id, req.user.role);
  }

  // ─── Leave Logs (Admin only) ──────────────────────────────

  @Get('logs')
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin')
  async getLeaveLogs(@Req() req: AuthenticatedRequest) {
    return this.leaveService.getLeaveLogs(req.user.id, req.user.role);
  }

  @Get('logs/:id')
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin')
  async getLeaveLogDetail(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leaveService.getLeaveLogDetail(id, req.user.id, req.user.role);
  }

  // ─── Change User Role (Admin only) ────────────────────────

  @Patch('users/:id/role')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leaveService.updateUserRole(id, role, req.user.email);
  }

  // ─── Change User Department (Admin / HR) ──────────────────

  @Patch('users/:id/department')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async updateUserDepartment(
    @Param('id') id: string,
    @Body('departmentId') departmentId: string | null,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.leaveService.updateUserDepartment(id, departmentId, req.user.email);
  }
}
