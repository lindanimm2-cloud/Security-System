import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class MapTickerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MapTickerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 4000);
    this.logger.log('Map position ticker started');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      const [officers, vehicles, clients, fleet] = await Promise.all([
        this.prisma.officer.findMany({
          where: { tenantId: tenant.id, isActive: true, currentLat: { not: null } },
          select: { id: true, currentLat: true, currentLng: true },
        }),
        this.prisma.vehicle.findMany({
          where: { tenantId: tenant.id, lastKnownLat: { not: null } },
          select: { id: true, lastKnownLat: true, lastKnownLng: true, theftRecovery: true },
        }),
        this.prisma.user.findMany({
          where: {
            tenantId: tenant.id,
            trackingEnabled: true,
            lastKnownLat: { not: null },
            role: { in: ['USER', 'FAMILY_MEMBER'] },
          },
          select: { id: true, lastKnownLat: true, lastKnownLng: true },
        }),
        this.prisma.companyVehicle.findMany({
          where: { tenantId: tenant.id, isActive: true, currentLat: { not: null } },
          select: { id: true, currentLat: true, currentLng: true },
        }),
      ]);

      const updates = [
        ...officers.map((o) => ({
          entityType: 'officer' as const,
          id: o.id,
          lat: this.jitter(Number(o.currentLat), Number(o.currentLng), o.id).lat,
          lng: this.jitter(Number(o.currentLat), Number(o.currentLng), o.id).lng,
        })),
        ...vehicles.map((v) => ({
          entityType: 'vehicle' as const,
          id: v.id,
          lat: this.jitter(Number(v.lastKnownLat), Number(v.lastKnownLng), v.id, v.theftRecovery ? 0.005 : 0.002).lat,
          lng: this.jitter(Number(v.lastKnownLat), Number(v.lastKnownLng), v.id, v.theftRecovery ? 0.005 : 0.002).lng,
        })),
        ...clients.map((c) => ({
          entityType: 'client' as const,
          id: c.id,
          lat: this.jitter(Number(c.lastKnownLat), Number(c.lastKnownLng), c.id, 0.001).lat,
          lng: this.jitter(Number(c.lastKnownLat), Number(c.lastKnownLng), c.id, 0.001).lng,
        })),
        ...fleet.map((f) => ({
          entityType: 'fleet' as const,
          id: f.id,
          lat: this.jitter(Number(f.currentLat), Number(f.currentLng), f.id, 0.0015).lat,
          lng: this.jitter(Number(f.currentLat), Number(f.currentLng), f.id, 0.0015).lng,
        })),
      ];

      if (updates.length) {
        this.realtime.emitPositionUpdates(tenant.id, updates);
      }
    }
  }

  private jitter(lat: number, lng: number, seed: string, amplitude = 0.002) {
    const t = Date.now() / 12000;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
    return {
      lat: lat + Math.sin(t + h) * amplitude,
      lng: lng + Math.cos(t + h * 1.7) * amplitude,
    };
  }
}
