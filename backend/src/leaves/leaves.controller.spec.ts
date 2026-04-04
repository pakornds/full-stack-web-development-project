import { Test, TestingModule } from '@nestjs/testing';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto, UpdateLeaveDto, UpdateLeaveStatusDto } from './dto/leave.dto';

describe('LeavesController', () => {
  let controller: LeavesController;
  let service: jest.Mocked<LeavesService>;

  beforeEach(async () => {
    const mockLeavesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByUserId: jest.fn(),
      findByDepartmentId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeavesController],
      providers: [
        {
          provide: LeavesService,
          useValue: mockLeavesService,
        },
      ],
    }).compile();

    controller = module.get<LeavesController>(LeavesController);
    service = module.get(LeavesService) as any;
  });

  describe('create', () => {
    it('should create a leave', async () => {
      const req = { user: { id: 'user1', role: 'employee' } };
      const dto: CreateLeaveDto = { startDate: '2023-01-01', endDate: '2023-01-02', leaveType: 'type1', reason: 'Vacation' };
      service.create.mockResolvedValue('created' as any);

      const result = await controller.create(req as any, dto);
      expect(result).toBe('created');
      expect(service.create).toHaveBeenCalledWith('user1', dto);
    });
  });

  describe('findAll', () => {
    it('should return user leaves for employee', async () => {
      const req = { user: { id: 'user1', role: 'employee' } };
      service.findByUserId.mockResolvedValue('userLeaves' as any);

      const result = await controller.findAll(req as any);
      expect(result).toBe('userLeaves');
      expect(service.findByUserId).toHaveBeenCalledWith('user1');
    });

    it('should return user leaves for manager without department id', async () => {
      const req = { user: { id: 'user1', role: 'manager' } };
      service.findByUserId.mockResolvedValue('userLeaves' as any);

      const result = await controller.findAll(req as any);
      expect(result).toBe('userLeaves');
      expect(service.findByUserId).toHaveBeenCalledWith('user1');
    });

    it('should return department leaves for manager with departmentId', async () => {
      const req = { user: { id: 'user1', role: 'manager', departmentId: 'dept1' } };
      service.findByDepartmentId.mockResolvedValue('deptLeaves' as any);

      const result = await controller.findAll(req as any);
      expect(result).toBe('deptLeaves');
      expect(service.findByDepartmentId).toHaveBeenCalledWith('dept1');
    });

    it('should return all leaves for admin', async () => {
      const req = { user: { id: 'user1', role: 'admin' } };
      service.findAll.mockResolvedValue('allLeaves' as any);

      const result = await controller.findAll(req as any);
      expect(result).toBe('allLeaves');
      expect(service.findAll).toHaveBeenCalledWith();
    });
  });

  describe('update', () => {
    it('should update a leave', async () => {
      const req = { user: { id: 'user1', role: 'employee' } };
      const dto: UpdateLeaveDto = { startDate: '2023-01-01', endDate: '2023-01-02', leaveType: 'type1', reason: 'Vacation' };
      service.update.mockResolvedValue('updated' as any);

      const result = await controller.update(req as any, 'leave1', dto);
      expect(result).toBe('updated');
      expect(service.update).toHaveBeenCalledWith('leave1', 'user1', 'employee', dto);
    });
  });

  describe('remove', () => {
    it('should remove a leave', async () => {
      const req = { user: { id: 'user1', role: 'employee' } };
      service.remove.mockResolvedValue('removed' as any);

      const result = await controller.remove(req as any, 'leave1');
      expect(result).toBe('removed');
      expect(service.remove).toHaveBeenCalledWith('leave1', 'user1', 'employee');
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a leave', async () => {
      const req = { user: { id: 'user1', role: 'manager' } };
      const dto: UpdateLeaveStatusDto = { status: 'approved' };
      service.updateStatus.mockResolvedValue('statusUpdated' as any);

      const result = await controller.updateStatus(req as any, 'leave1', dto);
      expect(result).toBe('statusUpdated');
      expect(service.updateStatus).toHaveBeenCalledWith('leave1', 'approved', 'user1');
    });
  });
});
