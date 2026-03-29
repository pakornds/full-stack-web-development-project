import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateLeaveDto) {
    const cleanReason = sanitizeHtml(data.reason, {
      allowedTags: [],
      allowedAttributes: {},
    });

    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.prisma.leaveRequest.create({
      data: {
        userId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        leaveType: data.leaveType,
        reason: cleanReason,
        status: 'Pending',
      },
    });
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { userId },
      include: {
        approvedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, userId: string, role: string, data: UpdateLeaveDto) {
    const leaveItem = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });
    if (!leaveItem) throw new NotFoundException('Leave request not found');

    if (leaveItem.status !== 'Pending') {
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

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        leaveType: data.leaveType,
        reason: cleanReason,
      },
    });
  }

  async remove(id: string, userId: string, role: string) {
    const leaveItem = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });
    if (!leaveItem) throw new NotFoundException('Leave request not found');

    if (leaveItem.status !== 'Pending') {
      throw new ForbiddenException('Cannot delete finalized requests');
    }

    if (role === 'employee' && leaveItem.userId !== userId) {
      throw new ForbiddenException('You can only delete your own requests');
    }

    return this.prisma.leaveRequest.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string, approverId: string) {
    const leaveItem = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });
    if (!leaveItem) throw new NotFoundException('Leave request not found');
    if (leaveItem.status !== 'Pending') {
      throw new ForbiddenException('Cannot edit a finalized request');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedById:
          status === 'Approved' || status === 'Rejected' ? approverId : null,
      },
    });
  }
}
