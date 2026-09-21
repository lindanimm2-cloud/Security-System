import { Injectable } from '@nestjs/common';
import { IncidentStatus, IncidentType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const CORRELATE_WINDOW_MS = 120_000;
const CORRELATE_RADIUS_M = 500;

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type CorrelateQuery = {
  tenantId: string;
  userId: string;
  vehicleId?: string | null;
  lat?: number | null;
  lng?: number | null;
  kinds: string[];
};

@Injectable()
export class IncidentCorrelationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Find an open incident that should absorb this new signal instead of creating another. */
  async findOpenMatch(query: CorrelateQuery) {
    const since = new Date(Date.now() - CORRELATE_WINDOW_MS);
    const candidates = await this.prisma.incident.findMany({
      where: {
        tenantId: query.tenantId,
        status: { in: [IncidentStatus.ACTIVE, IncidentStatus.DISPATCHED, IncidentStatus.EN_ROUTE] },
        createdAt: { gte: since },
        OR: [
          { userId: query.userId },
          ...(query.vehicleId ? [{ vehicleId: query.vehicleId }] : []),
        ],
        type: { in: [IncidentType.PANIC, IncidentType.CRASH, IncidentType.THEFT, IncidentType.OTHER] },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    for (const incident of candidates) {
      const snap = (incident.contextSnapshot ?? {}) as Record<string, unknown>;
      const kind = String(snap.kind ?? '');
      if (query.kinds.length && kind && !query.kinds.includes(kind)) {
        // Still allow crash↔panic merge when kinds differ but vehicle/user align
        const crashFamily = ['vehicle-crash', 'vehicle-panic', 'voice-sos', 'voice-silent'];
        if (!crashFamily.includes(kind)) continue;
        if (!query.kinds.some((k) => crashFamily.includes(k))) continue;
      }

      if (
        query.lat != null &&
        query.lng != null &&
        incident.lat != null &&
        incident.lng != null &&
        Number.isFinite(Number(incident.lat)) &&
        Number.isFinite(Number(incident.lng))
      ) {
        const dist = haversineM(
          { lat: query.lat, lng: query.lng },
          { lat: Number(incident.lat), lng: Number(incident.lng) },
        );
        if (dist > CORRELATE_RADIUS_M) continue;
      }

      return incident;
    }
    return null;
  }

  async attachSourceNote(
    tenantId: string,
    incidentId: string,
    content: string,
  ) {
    await this.prisma.incidentNote.create({
      data: {
        tenantId,
        incidentId,
        authorRole: 'SYSTEM',
        authorName: '4DS Integrations',
        content,
      },
    });
  }
}
