import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { PermissionCode } from './permissions.catalog';
import { PERMISSION_KEY } from './require-permission.decorator';
import { PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const codes = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!codes?.length) return true;
    const { user } = context.switchToHttp().getRequest<{ user?: { role: UserRole } }>();
    if (!user?.role) return false;
    return codes.some((code) => this.permissions.has(user.role, code));
  }
}
