import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

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
        approvedBy: { select: { id: true, name: true } },
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
        approver: r.approvedBy?.name || null,
        createdAt: r.createdAt,
      })),
    };
  }


  // ─── Department Leave Dashboard (HR / Admin) ──────────────

  async getDepartmentLeave(userId: string, role: string) {
    let deptWhere = {};
    if (role === 'manager') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });
      if (user?.departmentId) {
        deptWhere = { id: user.departmentId };
      } else {
        return [];
      }
    }

    const departments = await this.prisma.department.findMany({
      where: deptWhere,
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

    const unassignedUsers = role === 'admin' ? await this.prisma.user.findMany({
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
    }) : [];

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

  async getLeaveLogs(userId: string, role: string) {
    if (role !== 'admin') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { department: true }
      });
      if (user?.department?.name !== 'Human Resources') {
        throw new ForbiddenException('Only HR department can view leave logs');
      }
    }

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
        approvedBy: { select: { id: true, name: true } },
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
      approver: r.approvedBy
        ? { id: r.approvedBy.id, name: r.approvedBy.name }
        : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async getLeaveLogDetail(requestId: string, userId: string, role: string) {
    if (role !== 'admin') {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { department: true }
      });
      if (u?.department?.name !== 'Human Resources') {
        throw new ForbiddenException('Only HR department can view leave logs');
      }
    }

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
        approvedBy: { select: { id: true, name: true, email: true } },
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
      approver: request.approvedBy
        ? {
            id: request.approvedBy.id,
            name: request.approvedBy.name,
            email: request.approvedBy.email,
          }
        : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  // ─── Change User Role ─────────────────────────────────────
  async updateUserRole(userId: string, roleName: string, adminEmail: string) {
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

    this.auditService.logAction(adminEmail, 'UPDATE_ROLE', 'User', { targetUserId: userId, newRole: roleName });

    return { message: `Successfully updated user role to ${roleName}` };
  }

  // ─── Change User Department ─────────────────────────────────
  async updateUserDepartment(userId: string, departmentId: string | null, adminEmail: string) {
    if (departmentId === 'unassigned') {
      departmentId = null;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { departmentId },
    });
    
    this.auditService.logAction(adminEmail, 'UPDATE_DEPARTMENT', 'User', { targetUserId: userId, newDepartment: departmentId });
    
    return { message: `Successfully updated user department` };
  }
}
