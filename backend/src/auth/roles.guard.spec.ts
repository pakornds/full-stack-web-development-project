import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  // Mock Request object
  const mockRequest = (user?: any) => ({ user });

  // Mock ExecutionContext
  const mockExecutionContext = (req: any): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    } as any);

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no roles are required (ROLES_KEY metadata is empty)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = mockExecutionContext(mockRequest());

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should return false if user does not exist on request but roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = mockExecutionContext(mockRequest(undefined)); // No user in req

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should return false if user role does not match required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    const context = mockExecutionContext(mockRequest({ role: 'USER' }));

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should return true if user role matches one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MANAGER']);
    const context = mockExecutionContext(mockRequest({ role: 'ADMIN' }));

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
