import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// stores the required roles as metadata on the route handler, keyed by ROLES_KEY = 'roles'.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
