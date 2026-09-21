import { Injectable } from '@nestjs/common';
import { IncidentPriority, IncidentType } from '@prisma/client';
import {
  IncidentKernelService,
  type EmergencyKind,
} from '../../incident-kernel/incident-kernel.service';
import { IncidentCorrelationService } from '../correlation/incident-correlation.service';
import {
  crashOpsLabel,
  type CrashPlatform,
  type VehicleCrashDetectedEvent,
} from '../events';
import type { CrashAdapter } from './crash-adapter';
import {
  androidVehicleSafetyAdapter,
  appleSafetyKitAdapter,
  dashcamAdapter,
  fleetTrackerAdapter,
  iotImpactAdapter,
  manualPanicCrashAdapter,
  oemAdapter,
  telematicsAdapter,
} from './adapters/generic.adapter';

const ADAPTERS: Record<CrashPlatform, CrashAdapter> = {
  'apple-safetykit': appleSafetyKitAdapter,
  'android-vehicle-safety': androidVehicleSafetyAdapter,
  telematics: telematicsAdapter,
  oem: oemAdapter,
  'fleet-tracker': fleetTrackerAdapter,
  dashcam: dashcamAdapter,
  'iot-impact': iotImpactAdapter,
  'manual-panic': manualPanicCrashAdapter,
};

export type CrashReadiness = {
  appleCrashDetection: 'ok' | 'warn' | 'unavailable';
  appleEntitlement: 'ok' | 'unavailable';
  appleWatch: 'ok' | 'warn' | 'unavailable';
  vehicleConnection: 'ok' | 'warn' | 'unavailable';
  voiceSosLinked: 'ok' | 'warn' | 'unavailable';
  /** Never claim Crash Detection is active without OS entitlement. */
  message: string;
  fallbacks: string[];
};

@Injectable()
export class CrashDetectionManager {
  constructor(
    private readonly kernel: IncidentKernelService,
    private readonly correlation: IncidentCorrelationService,
  ) {}

  getAdapter(platform: string): CrashAdapter {
    const key = platform.toLowerCase().replace(/_/g, '-') as CrashPlatform;
    return ADAPTERS[key] ?? telematicsAdapter;
  }

  getReadiness(_tenantId?: string, _userId?: string): CrashReadiness {
    // Web monorepo: SafetyKit entitlement lives in a native iOS app — unavailable here.
    return {
      appleCrashDetection: 'unavailable',
      appleEntitlement: 'unavailable',
      appleWatch: 'warn',
      vehicleConnection: 'warn',
      voiceSosLinked: 'warn',
      message:
        'Crash Detection integration unavailable on this web client. Apple SafetyKit requires a native iOS app with the severe-vehicular-crash-event entitlement.',
      fallbacks: [
        'Manual SOS',
        'Vehicle panic',
        'Location sharing',
        'Push alerts',
        'Vehicle hardware / telematics when linked',
      ],
    };
  }

  async handleEvent(
    platform: string,
    payload: Record<string, unknown>,
    ctx?: { tenantId?: string; userId?: string },
  ) {
    const adapter = this.getAdapter(platform);
    const event = await adapter.normalize(payload, ctx);
    if (!event) {
      return { ok: false as const, error: 'Unable to normalize crash event' };
    }
    return this.ingest(event);
  }

  async ingest(event: VehicleCrashDetectedEvent) {
    const primary =
      event.crashLocation ??
      event.vehicleGps ??
      event.phoneLocation ??
      event.lastKnownGps ??
      event.officerLocation;
    const lat = primary?.lat ?? -29.8587;
    const lng = primary?.lng ?? 31.0218;
    const label = crashOpsLabel(event.confidence);

    const match = await this.correlation.findOpenMatch({
      tenantId: event.tenantId,
      userId: event.userId,
      vehicleId: event.vehicleId,
      lat,
      lng,
      kinds: ['vehicle-crash', 'vehicle-panic', 'voice-sos', 'voice-silent', 'panic'],
    });

    if (match) {
      await this.correlation.attachSourceNote(
        event.tenantId,
        match.id,
        `Correlated crash signal · ${label} · ${event.platform} · confidence=${event.confidence}`,
      );
      return {
        ok: true as const,
        incidentId: match.id,
        publicRef: match.publicRef,
        label,
        confidence: event.confidence,
        created: false,
        correlated: true,
      };
    }

    const kind: EmergencyKind = 'vehicle-crash';
    const incident = await this.kernel.createFromEmergency({
      tenantId: event.tenantId,
      userId: event.userId,
      type: IncidentType.CRASH,
      title: label,
      description: this.buildDescription(event),
      lat,
      lng,
      address: primary?.label ?? undefined,
      isSilent: false,
      priority: IncidentPriority.CRITICAL,
      vehicleId: event.vehicleId,
      source: 'crash',
      kind,
      autoDispatch: true,
    });

    return {
      ok: true as const,
      incidentId: incident.id,
      publicRef: incident.publicRef,
      label,
      confidence: event.confidence,
      created: true,
      correlated: false,
    };
  }

  private buildDescription(event: VehicleCrashDetectedEvent) {
    const parts = [
      `Source: ${event.platform}`,
      `Confidence: ${event.confidence}`,
      event.vehicleId ? `Vehicle: ${event.vehicleId}` : null,
      event.driverId ? `Driver: ${event.driverId}` : null,
      event.officerId ? `Officer: ${event.officerId}` : null,
      event.crashLocation ? 'Crash location: received' : null,
      event.vehicleGps ? 'Vehicle GPS: online' : null,
      event.phoneLocation ? 'Phone location: received' : null,
      event.lastKnownGps ? 'Last known GPS: available' : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }
}
