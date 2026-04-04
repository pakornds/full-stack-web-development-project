import { Test, TestingModule } from '@nestjs/testing';
import { LeavesService } from './leaves.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';

describe('LeavesService', () => {
  let service: LeavesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      leaveRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      leaveQuota: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeavesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<LeavesService>(LeavesService);
    prisma = module.get(PrismaService) as any;
  });

  describe('create', () => {
    it('should throw BadRequestException if start date > end date', async () => {
      const dto: CreateLeaveDto = { startDate: '2023-01-02', endDate: '2023-01-01', leaveType: 'lt', reason: 'reason' };
      await expect(service.create('user1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should create leave successfully', async () => {
      const dto: CreateLeaveDto = { startDate: '2023-01-01', endDate: '2023-01-02', leaveType: 'lt', reason: 'reason' };
      prisma.leaveRequest.create.mockResolvedValue('created' as any);
      
      const result = await service.create('user1', dto);
      expect(result).toBe('created');
      expect(prisma.leaveRequest.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-02'),
          leaveTypeId: 'lt',
          reason: 'reason',
          status: 'Pending',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should find all leaves', async () => {
      prisma.leaveRequest.findMany.mockResolvedValue('allLeaves' as any);
      const result = await service.findAll();
      expect(result).toBe('allLeaves');
      expect(prisma.leaveRequest.findMany).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should find by user id', async () => {
      prisma.leaveRequest.findMany.mockResolvedValue('userLeaves' as any);
      const result = await service.findByUserId('user1');
      expect(result).toBe('userLeaves');
      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByDepartmentId', () => {
    it('should find by department id', async () => {
      prisma.leaveRequest.findMany.mockResolvedValue('deptLeaves' as any);
      const result = await service.findByDepartmentId('dept1');
      expect(result).toBe('deptLeaves');
      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith({
        where: { user: { departmentId: 'dept1' } },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue(null);
      await expect(service.update('id', 'user1', 'emp', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not pending', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'approved' } as any);
      await expect(service.update('id', 'user1', 'emp', {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if employee but wrong user', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'pending', userId: 'user2' } as any);
      await expect(service.update('id', 'user1', 'employee', {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if start date > end date', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'pending', userId: 'user1' } as any);
      const dto: UpdateLeaveDto = { startDate: '2023-01-02', endDate: '2023-01-01', leaveType: 'lt', reason: 'reason' };
      await expect(service.update('id', 'user1', 'employee', dto)).rejects.toThrow(BadRequestException);
    });

    it('should update leave request', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'pending', userId: 'user1' } as any);
      prisma.leaveRequest.update.mockResolvedValue('updated' as any);
      const dto: UpdateLeaveDto = { startDate: '2023-01-01', endDate: '2023-01-02', leaveType: 'lt', reason: 'reason' };
      
      const result = await service.update('id', 'user1', 'employee', dto);
      expect(result).toBe('updated');
      expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
        where: { id: 'id' },
        data: expect.any(Object),
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue(null);
      await expect(service.remove('id', 'user1', 'emp')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not pending', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'approved' } as any);
      await expect(service.remove('id', 'user1', 'emp')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if employee wrong user', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'pending', userId: 'user2' } as any);
      await expect(service.remove('id', 'user1', 'employee')).rejects.toThrow(ForbiddenException);
    });

    it('should delete leave request', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'pending', userId: 'user1' } as any);
      prisma.leaveRequest.delete.mockResolvedValue('deleted' as any);
      
      const result = await service.remove('id', 'user1', 'employee');
      expect(result).toBe('deleted');
      expect(prisma.leaveRequest.delete).toHaveBeenCalledWith({ where: { id: 'id' } });
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus('id', 'approved', 'app1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not pending', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'approved' } as any);
      await expect(service.updateStatus('id', 'approved', 'app1')).rejects.toThrow(ForbiddenException);
    });

    it('should update status to rejected', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ status: 'pending' } as any);
      prisma.leaveRequest.update.mockResolvedValue('rejected' as any);

      const result = await service.updateStatus('id', 'rejected', 'app1');
      expect(result).toBe('rejected');
      expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
        where: { id: 'id' },
        data: { status: 'rejected', approvedById: 'app1' },
      });
      expect(prisma.leaveQuota.updateMany).not.toHaveBeenCalled();
    });

    it('should update status to approved and update quota', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({ 
        status: 'pending', 
        startDate: new Date('2023-01-01'), 
        endDate: new Date('2023-01-03'), 
        userId: 'u1', 
        leaveTypeId: 'lt1' 
      } as any);
      prisma.leaveRequest.update.mockResolvedValue('approved' as any);

      const result = await service.updateStatus('id', 'approved', 'app1');
      expect(result).toBe('approved');
      expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
        where: { id: 'id' },
        data: { status: 'approved', approvedById: 'app1' },
      });
      expect(prisma.leaveQuota.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', leaveTypeId: 'lt1', year: 2023 },
        data: { usedDays: { increment: 3 } },
      });
    });
  });
});
