import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveRequestDto, UpdateLeaveStatusDto } from './dto/leave.dto';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Leave Types ──────────────────────────────────────────

  async getLeaveTypes() {
    return this.prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
  }

  // ─── Personal Leave Dashboard ─────────────────────────────

  async getPersonalLeave(userId: string) {
    const currentYear = new Date().getFullYear();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const quotas = await this.prisma.leaveQuota.findMany({
      where: { userId, year: currentYear },
      include: { leaveType: true },
      orderBy: { leaveType: { name: 'asc' } },
    });

    const leaveHistory = await this.prisma.leaveRequest.findMany({
      where: { userId },
      include: {
        leaveType: true,
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        department: user.department,
      },
      quotas: quotas.map((q) => ({
        id: q.id,
        leaveType: q.leaveType.name,
        leaveTypeId: q.leaveTypeId,
        totalDays: q.totalDays,
        usedDays: q.usedDays,
        remainingDays: q.totalDays - q.usedDays,
        year: q.year,
      })),
      leaveHistory: leaveHistory.map((r) => ({
        id: r.id,
        leaveType: r.leaveType.name,
        startDate: r.startDate,
        endDate: r.endDate,
        reason: r.reason,
        status: r.status,
        approver: r.approver?.name || null,
        createdAt: r.createdAt,
      })),
    };
  }

  // ─── Create Leave Request ─────────────────────────────────

  async createLeaveRequest(userId: string, dto: CreateLeaveRequestDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate number of days
    const days =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    // Check leave type exists
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    // Check quota
    const currentYear = new Date().getFullYear();
    const quota = await this.prisma.leaveQuota.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId: dto.leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (!quota) throw new NotFoundException('Leave quota not found');

    if (quota.usedDays + days > quota.totalDays) {
      throw new BadRequestException(
        `Insufficient leave balance. You have ${quota.totalDays - quota.usedDays} day(s) left for ${leaveType.name}.`,
      );
    }

    return this.prisma.leaveRequest.create({
      data: {
        userId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        reason: dto.reason || '',
        status: 'pending',
      },
      include: {
        leaveType: true,
      },
    });
  }

  // ─── Update Leave Request Status (HR / Admin) ─────────────

  async updateLeaveStatus(
    requestId: string,
    approverId: string,
    dto: UpdateLeaveStatusDto,
  ) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true },
    });

    if (!leaveRequest) throw new NotFoundException('Leave request not found');

    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException(
        `Leave request has already been ${leaveRequest.status}`,
      );
    }

    // Update the leave request
    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        approverId,
      },
      include: {
        leaveType: true,
        user: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    // If approved, update the quota
    if (dto.status === 'approved') {
      const days =
        Math.ceil(
          (leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1;

      const currentYear = new Date().getFullYear();

      await this.prisma.leaveQuota.updateMany({
        where: {
          userId: leaveRequest.userId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year: currentYear,
        },
        data: { usedDays: { increment: days } },
      });
    }

    return updated;
  }

  // ─── Department Leave Dashboard (HR / Admin) ──────────────

  async getDepartmentLeave() {
    // HR sees users in all departments, Admin sees all
    // Since RBAC is handled by guards in the controller, everyone querying this receives all departments.

    const departments = await this.prisma.department.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { id: true, name: true } },
            leaveQuotas: {
              where: { year: new Date().getFullYear() },
              include: { leaveType: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const unassignedUsers = await this.prisma.user.findMany({
      where: { departmentId: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { id: true, name: true } },
        leaveQuotas: {
          where: { year: new Date().getFullYear() },
          include: { leaveType: true },
        },
      },
    });

    const formattedDepts = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      members: dept.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        quotas: user.leaveQuotas.map((q) => ({
          leaveType: q.leaveType.name,
          totalDays: q.totalDays,
          usedDays: q.usedDays,
          remainingDays: q.totalDays - q.usedDays,
        })),
        totalUsed: user.leaveQuotas.reduce((sum, q) => sum + q.usedDays, 0),
        totalQuota: user.leaveQuotas.reduce((sum, q) => sum + q.totalDays, 0),
      })),
      totalUsed: dept.users.reduce(
        (sum, u) => sum + u.leaveQuotas.reduce((s, q) => s + q.usedDays, 0),
        0,
      ),
      totalQuota: dept.users.reduce(
        (sum, u) => sum + u.leaveQuotas.reduce((s, q) => s + q.totalDays, 0),
        0,
      ),
    }));

    if (unassignedUsers.length > 0) {
      formattedDepts.push({
        id: 'unassigned',
        name: 'Unassigned',
        members: unassignedUsers.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          quotas: user.leaveQuotas.map((q) => ({
            leaveType: q.leaveType.name,
            totalDays: q.totalDays,
            usedDays: q.usedDays,
            remainingDays: q.totalDays - q.usedDays,
          })),
          totalUsed: user.leaveQuotas.reduce((sum, q) => sum + q.usedDays, 0),
          totalQuota: user.leaveQuotas.reduce((sum, q) => sum + q.totalDays, 0),
        })),
        totalUsed: unassignedUsers.reduce(
          (sum, u) => sum + u.leaveQuotas.reduce((s, q) => s + q.usedDays, 0),
          0,
        ),
        totalQuota: unassignedUsers.reduce(
          (sum, u) => sum + u.leaveQuotas.reduce((s, q) => s + q.totalDays, 0),
          0,
        ),
      });
    }

    return formattedDepts;
  }

  // ─── Leave Logs (Admin only) ──────────────────────────────

  async getLeaveLogs() {
    const requests = await this.prisma.leaveRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: true,
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      requester: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        department: r.user.department?.name || 'Unassigned',
      },
      leaveType: r.leaveType.name,
      startDate: r.startDate,
      endDate: r.endDate,
      reason: r.reason,
      status: r.status,
      approver: r.approver
        ? { id: r.approver.id, name: r.approver.name }
        : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async getLeaveLogDetail(requestId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        leaveType: true,
        approver: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) throw new NotFoundException('Leave request not found');

    const days =
      Math.ceil(
        (request.endDate.getTime() - request.startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1;

    return {
      id: request.id,
      requester: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
        role: request.user.role.name,
        department: request.user.department?.name || 'Unassigned',
      },
      leaveType: request.leaveType.name,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: days,
      reason: request.reason,
      status: request.status,
      approver: request.approver
        ? {
            id: request.approver.id,
            name: request.approver.name,
            email: request.approver.email,
          }
        : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  // ─── Change User Role ─────────────────────────────────────
  async updateUserRole(userId: string, roleName: string) {
    const roleRecord = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!roleRecord) {
      throw new BadRequestException(
        `Role entirely missing from DB: ${roleName}`,
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: roleRecord.id },
    });

    return { message: `Successfully updated user role to ${roleName}` };
  }

  // ─── Change User Department ─────────────────────────────────
  async updateUserDepartment(userId: string, departmentId: string | null) {
    if (departmentId === 'unassigned') {
      departmentId = null;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { departmentId },
    });
    return { message: `Successfully updated user department` };
  }
}
