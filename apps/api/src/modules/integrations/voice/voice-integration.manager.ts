import { Injectable } from '@nestjs/common';
import { IncidentPriority, IncidentType } from '@prisma/client';
import {
  IncidentKernelService,
  type EmergencyKind,
} from '../../incident-kernel/incident-kernel.service';
import { IncidentCorrelationService } from '../correlation/incident-correlation.service';
import {
  VOICE_SPOKEN_REPLY,
  type VoiceCommandEvent,
  type VoiceCommandLevel,
  type VoicePlatform,
} from '../events';
import type { VoiceAdapter } from './voice-adapter';
import {
  alexaAdapter,
  genericVoiceAdapter,
  googleHomeAdapter,
  homeAssistantAdapter,
  matterAdapter,
  siriAdapter,
  smartThingsAdapter,
} from './adapters/generic.adapter';

const ADAPTERS: Record<VoicePlatform, VoiceAdapter> = {
  alexa: alexaAdapter,
  'google-home': googleHomeAdapter,
  siri: siriAdapter,
  smartthings: smartThingsAdapter,
  'home-assistant': homeAssistantAdapter,
  matter: matterAdapter,
  generic: genericVoiceAdapter,
};

export type VoiceTenantConfig = {
  requireConfirmForEmergency: boolean;
  silentSosEnabled: boolean;
  silentPhrases: string[];
};

const DEFAULT_VOICE_CONFIG: VoiceTenantConfig = {
  requireConfirmForEmergency: true,
  silentSosEnabled: false,
  silentPhrases: [],
};

@Injectable()
export class VoiceIntegrationManager {
  constructor(
    private readonly kernel: IncidentKernelService,
    private readonly correlation: IncidentCorrelationService,
  ) {}

  getAdapter(platform: string): VoiceAdapter {
    const key = platform.toLowerCase().replace(/_/g, '-') as VoicePlatform;
    return ADAPTERS[key] ?? genericVoiceAdapter;
  }

  getConfig(_tenantId: string, _userId?: string): VoiceTenantConfig {
    // Tenant overrides can be wired to settings later; safe defaults for now.
    return { ...DEFAULT_VOICE_CONFIG };
  }

  async handleWebhook(
    platform: string,
    payload: Record<string, unknown>,
    ctx?: { tenantId?: string; userId?: string },
  ) {
    const adapter = this.getAdapter(platform);
    const event = await adapter.normalize(payload, ctx);
    if (!event) {
      return { ok: false as const, error: 'Unable to normalize voice command' };
    }
    return this.ingest(event, payload);
  }

  async ingest(event: VoiceCommandEvent, raw?: Record<string, unknown>) {
    const config = this.getConfig(event.tenantId, event.userId);

    if (event.level === 'INFO') {
      return {
        ok: true as const,
        level: event.level,
        incidentId: null,
        spokenReply: VOICE_SPOKEN_REPLY.INFO,
        created: false,
      };
    }

    if (event.level === 'SILENT_SOS' && !config.silentSosEnabled) {
      return {
        ok: false as const,
        error: 'Silent voice SOS is not enabled for this account',
      };
    }

    if (
      event.level === 'EMERGENCY' &&
      config.requireConfirmForEmergency &&
      event.requireConfirm !== false &&
      raw?.confirmed !== true
    ) {
      return {
        ok: true as const,
        level: event.level,
        needsConfirmation: true,
        spokenReply: 'Do you want me to activate your 4DS emergency alert?',
        incidentId: null,
        created: false,
      };
    }

    const kind = this.kindForLevel(event.level);
    const lat = event.location?.lat ?? -29.8587;
    const lng = event.location?.lng ?? 31.0218;

    const match = await this.correlation.findOpenMatch({
      tenantId: event.tenantId,
      userId: event.userId,
      vehicleId: event.vehicleId,
      lat,
      lng,
      kinds: ['voice-sos', 'voice-silent', 'voice-assistance', 'vehicle-crash', 'vehicle-panic', 'panic', 'silent'],
    });

    if (match) {
      await this.correlation.attachSourceNote(
        event.tenantId,
        match.id,
        `Correlated voice ${event.level} via ${event.platform}${event.rawPhrase ? ` · “${event.rawPhrase}”` : ''}`,
      );
      return {
        ok: true as const,
        level: event.level,
        incidentId: match.id,
        publicRef: match.publicRef,
        spokenReply: this.spokenReply(event),
        created: false,
        correlated: true,
      };
    }

    const isSilent = event.level === 'SILENT_SOS';
    const incident = await this.kernel.createFromEmergency({
      tenantId: event.tenantId,
      userId: event.userId,
      type: IncidentType.PANIC,
      title: this.titleForLevel(event.level, event.platform),
      description: event.rawPhrase
        ? `Voice ${event.level} · ${event.platform} · ${event.rawPhrase}`
        : `Voice ${event.level} · ${event.platform}`,
      lat,
      lng,
      address: event.location?.label ?? undefined,
      isSilent,
      priority:
        event.level === 'ASSISTANCE' ? IncidentPriority.MEDIUM : IncidentPriority.CRITICAL,
      propertyId: event.propertyId,
      vehicleId: event.vehicleId,
      source: 'voice',
      kind,
      autoDispatch: event.level !== 'ASSISTANCE',
    });

    return {
      ok: true as const,
      level: event.level,
      incidentId: incident.id,
      publicRef: incident.publicRef,
      spokenReply: this.spokenReply(event),
      created: true,
      correlated: false,
    };
  }

  private kindForLevel(level: VoiceCommandLevel): EmergencyKind {
    if (level === 'SILENT_SOS') return 'voice-silent';
    if (level === 'ASSISTANCE') return 'voice-assistance';
    return 'voice-sos';
  }

  private titleForLevel(level: VoiceCommandLevel, platform: string) {
    if (level === 'SILENT_SOS') return 'SILENT VOICE SOS';
    if (level === 'ASSISTANCE') return 'VOICE ASSISTANCE REQUEST';
    return `VOICE SOS · ${platform.toUpperCase()}`;
  }

  private spokenReply(event: VoiceCommandEvent) {
    if (event.level === 'SILENT_SOS') {
      return event.silentReply ?? VOICE_SPOKEN_REPLY.SILENT_SOS;
    }
    if (event.level === 'ASSISTANCE') return VOICE_SPOKEN_REPLY.ASSISTANCE;
    if (event.level === 'EMERGENCY') return VOICE_SPOKEN_REPLY.EMERGENCY;
    return VOICE_SPOKEN_REPLY.INFO;
  }
}
