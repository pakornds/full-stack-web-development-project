import {
  Controller,
  Get,
  Post,
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
import { CreateLeaveRequestDto, UpdateLeaveStatusDto } from './dto/leave.dto';

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
  @Roles('hr', 'admin')
  async getPersonalLeaveForUser(@Param('userId') userId: string) {
    return this.leaveService.getPersonalLeave(userId);
  }

  // ─── Create Leave Request ─────────────────────────────────

  @Post('request')
  async createLeaveRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.createLeaveRequest(req.user.id, dto);
  }

  // ─── Update Leave Status (HR / Admin) ─────────────────────

  @Patch('request/:id/status')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  async updateLeaveStatus(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateLeaveStatusDto,
  ) {
    return this.leaveService.updateLeaveStatus(id, req.user.id, dto);
  }

  // ─── Department Leave Dashboard (HR / Admin) ──────────────

  @Get('department')
  @UseGuards(RolesGuard)
  @Roles('hr', 'admin')
  async getDepartmentLeave() {
    return this.leaveService.getDepartmentLeave();
  }

  // ─── Leave Logs (Admin only) ──────────────────────────────

  @Get('logs')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getLeaveLogs() {
    return this.leaveService.getLeaveLogs();
  }

  @Get('logs/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getLeaveLogDetail(@Param('id') id: string) {
    return this.leaveService.getLeaveLogDetail(id);
  }

  // ─── Change User Role (Admin only) ────────────────────────

  @Patch('users/:id/role')
  @UseGuards(RolesGuard)
  @Roles('admin', 'hr')
  async updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.leaveService.updateUserRole(id, role);
  }

  // ─── Change User Department (Admin / HR) ──────────────────

  @Patch('users/:id/department')
  @UseGuards(RolesGuard)
  @Roles('admin', 'hr')
  async updateUserDepartment(
    @Param('id') id: string,
    @Body('departmentId') departmentId: string | null,
  ) {
    return this.leaveService.updateUserDepartment(id, departmentId);
  }
}
