import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type AuditWriteInput = {
  tenantId: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  accountUserId?: string | null;
  action: string;
  result?: string;
  reason?: string;
  source?: string;
  target?: string;
  previousState?: Prisma.InputJsonValue;
  newState?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(data: AuditWriteInput) {
    try {
      await this.prisma.securityAuditEvent.create({
        data: {
          id: randomUUID(),
          tenantId: data.tenantId,
          actorUserId: data.actorUserId ?? undefined,
          actorRole: data.actorRole ?? undefined,
          accountUserId: data.accountUserId ?? data.actorUserId ?? undefined,
          action: data.action,
          result: data.result ?? 'SUCCESS',
          reason: data.reason,
          source: data.source,
          target: data.target,
          previousState: data.previousState,
          newState: data.newState,
          ipAddress: data.ipAddress ?? undefined,
        },
      });
    } catch {
      // Audit must not break auth; failures are swallowed after best-effort write.
    }
  }
}

export function hashBackupCode(code: string) {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
