import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PERMISSIONS, ROLE_PERMISSION_DEFAULTS, type PermissionCode } from './permissions.catalog';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsService.name);
  private cache = new Map<UserRole, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
    await this.refresh();
  }

  async seedDefaults() {
    const rows = Object.entries(ROLE_PERMISSION_DEFAULTS).flatMap(([role, codes]) =>
      codes.map((permissionCode) => ({ role: role as UserRole, permissionCode })),
    );
    for (const row of rows) {
      await this.prisma.rolePermission.upsert({
        where: { role_permissionCode: { role: row.role, permissionCode: row.permissionCode } },
        create: row,
        update: {},
      });
    }
    this.logger.log(`Seeded ${PERMISSIONS.length} permission codes across ${Object.keys(ROLE_PERMISSION_DEFAULTS).length} roles`);
  }

  async refresh() {
    const rows = await this.prisma.rolePermission.findMany();
    this.cache.clear();
    for (const row of rows) {
      const set = this.cache.get(row.role) ?? new Set<string>();
      set.add(row.permissionCode);
      this.cache.set(row.role, set);
    }
  }

  has(role: UserRole | string, code: PermissionCode): boolean {
    const set = this.cache.get(role as UserRole);
    if (set?.has(code)) return true;
    return (ROLE_PERMISSION_DEFAULTS[role as UserRole] ?? []).includes(code);
  }
}
