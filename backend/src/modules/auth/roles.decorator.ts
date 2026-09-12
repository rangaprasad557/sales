import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('admin' | 'salesperson' | 'auditor')[]) => SetMetadata(ROLES_KEY, roles);
