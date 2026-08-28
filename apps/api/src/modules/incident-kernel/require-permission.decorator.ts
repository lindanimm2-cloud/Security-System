import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from './permissions.catalog';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (...codes: PermissionCode[]) => SetMetadata(PERMISSION_KEY, codes);
