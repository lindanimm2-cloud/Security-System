import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const CROSS_BRANCH_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
  UserRole.TENANT_ADMIN,
  UserRole.DEVELOPER,
  UserRole.MANAGER,
];

/**
 * Branch-scoped authorization helper (Phase 1 follow-on).
 * Cross-branch roles may see all branches; others must match branchId.
 */
export function assertBranchScope(opts: {
  actorRole: UserRole;
  actorBranchId?: string | null;
  resourceBranchId?: string | null;
  label?: string;
}): void {
  if (CROSS_BRANCH_ROLES.includes(opts.actorRole)) return;
  if (!opts.actorBranchId) {
    throw new ForbiddenException('Branch assignment required');
  }
  if (opts.resourceBranchId && opts.resourceBranchId !== opts.actorBranchId) {
    throw new ForbiddenException(`Access denied for this ${opts.label ?? 'branch resource'}`);
  }
}

export function canSeeAllBranches(role: UserRole): boolean {
  return CROSS_BRANCH_ROLES.includes(role);
}
