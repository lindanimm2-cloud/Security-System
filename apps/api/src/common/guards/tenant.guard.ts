import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Ensures the authenticated principal carries a tenantId.
 * Resource-level checks should still call assertSameTenant().
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user?.tenantId) {
      throw new ForbiddenException('Tenant context required');
    }
    return true;
  }
}

export function assertSameTenant(
  actorTenantId: string,
  resourceTenantId: string | null | undefined,
  label = 'resource',
): void {
  if (!resourceTenantId || resourceTenantId !== actorTenantId) {
    throw new ForbiddenException(`Access denied for this ${label}`);
  }
}
