import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';
import sanitizeHtml from 'sanitize-html';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(userId: string, userEmail: string, data: CreateLeaveDto) {
    const cleanReason = sanitizeHtml(data.reason, {
      allowedTags: [],
      allowedAttributes: {},
    });

    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }
    const result = await this.prisma.leaveRequest.create({
      data: {
        userId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        leaveTypeId: data.leaveType,
        reason: cleanReason,
        status: 'Pending',
      },
    });
    
    this.auditService.logAction(userEmail, 'CREATE', 'LeaveRequest', {
      leaveTypeId: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate
    });

    return result;
  }

  async findAll() {
    return this.prisma.leaveRequest.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
        approvedBy: {
          select: { name: true, email: true },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { userId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        approvedBy: {
          select: { name: true, email: true },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByDepartmentId(departmentId: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        user: {
          departmentId,
        },
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
        approvedBy: {
          select: { name: true, email: true },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, userEmail: string, role: string, data: UpdateLeaveDto) {
    const leaveItem = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });
    if (!leaveItem) throw new NotFoundException('Leave request not found');

    if (leaveItem.status.toLowerCase() !== 'pending') {
      throw new ForbiddenException('Only Pending requests can be modified');
    }

    if (role === 'employee' && leaveItem.userId !== userId) {
      throw new ForbiddenException('You can only modify your own requests');
    }

    const cleanReason = sanitizeHtml(data.reason, {
      allowedTags: [],
      allowedAttributes: {},
    });

    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        leaveTypeId: data.leaveType,
        reason: cleanReason,
      },
    });

    this.auditService.logAction(userEmail, 'UPDATE', 'LeaveRequest', { id, leaveTypeId: data.leaveType });

    return updated;
  }

  async remove(id: string, userId: string, userEmail: string, role: string) {
    const leaveItem = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });
    if (!leaveItem) throw new NotFoundException('Leave request not found');

    if (leaveItem.status.toLowerCase() !== 'pending') {
      throw new ForbiddenException('Cannot delete finalized requests');
    }

    if (role === 'employee' && leaveItem.userId !== userId) {
      throw new ForbiddenException('You can only delete your own requests');
    }

    const removed = await this.prisma.leaveRequest.delete({ where: { id } });

    this.auditService.logAction(userEmail, 'DELETE', 'LeaveRequest', { id });

    return removed;
  }

  async updateStatus(id: string, status: string, approverId: string, approverEmail: string) {
    const leaveItem = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });
    if (!leaveItem) throw new NotFoundException('Leave request not found');

    if (leaveItem.status.toLowerCase() !== 'pending') {
      throw new ForbiddenException('Cannot edit a finalized request');
    }

    const normalizedStatus = status.toLowerCase() === 'approved' ? 'approved' : 'rejected';

    return this.prisma.$transaction(async (prisma) => {
      const updatedRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: normalizedStatus,
          approvedById: approverId,
        },
      });

      if (normalizedStatus === 'approved') {
        const days =
          Math.ceil(
            (leaveItem.endDate.getTime() - leaveItem.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;

        await prisma.leaveQuota.updateMany({
          where: {
            userId: leaveItem.userId,
            leaveTypeId: leaveItem.leaveTypeId,
            year: leaveItem.startDate.getFullYear(),
          },
          data: { usedDays: { increment: days } },
        });
      }

      this.auditService.logAction(approverEmail, 'UPDATE_STATUS', 'LeaveRequest', { id, status: normalizedStatus });

      return updatedRequest;
    });
  }
}
