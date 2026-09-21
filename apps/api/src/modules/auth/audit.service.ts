import { createHash, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type AuthAuditInput = {
  tenantId: string;
  action: string;
  result?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  reason?: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  accountUserId?: string | null;
  source?: string;
  target?: string;
  ipAddress?: string | null;
  previousState?: Prisma.InputJsonValue;
  newState?: Prisma.InputJsonValue;
};

function hashAuditPayload(parts: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

/**
 * Append-only security audit writer with hash chaining.
 * Do not expose update/delete APIs for these rows from application code.
 * DB triggers also block UPDATE/DELETE where the migration was applied.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuthAuditInput) {
    try {
      const prev = await this.prisma.securityAuditEvent.findFirst({
        where: { tenantId: input.tenantId, eventHash: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { eventHash: true },
      });
      const id = randomUUID();
      const createdAt = new Date();
      const prevEventHash = prev?.eventHash ?? null;
      const eventHash = hashAuditPayload({
        id,
        tenantId: input.tenantId,
        action: input.action,
        result: input.result ?? 'SUCCESS',
        actorUserId: input.actorUserId ?? null,
        accountUserId: input.accountUserId ?? null,
        target: input.target ?? null,
        prevEventHash,
        createdAt: createdAt.toISOString(),
      });

      await this.prisma.securityAuditEvent.create({
        data: {
          id,
          tenantId: input.tenantId,
          actorUserId: input.actorUserId ?? null,
          actorRole: input.actorRole ?? null,
          accountUserId: input.accountUserId ?? null,
          action: input.action,
          result: input.result ?? 'SUCCESS',
          reason: input.reason ?? null,
          source: input.source ?? 'auth',
          target: input.target ?? null,
          previousState: input.previousState ?? undefined,
          newState: input.newState ?? undefined,
          ipAddress: input.ipAddress ?? null,
          eventHash,
          prevEventHash,
          createdAt,
        },
      });
    } catch {
      // Never fail the primary flow because audit write failed — log in future.
    }
  }
}
