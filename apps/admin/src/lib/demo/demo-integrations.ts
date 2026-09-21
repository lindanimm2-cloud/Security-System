/**
 * Demo stubs for Voice SOS + Crash Detection ingest.
 * Mirrors POST /integrations/voice/* and /integrations/crash/* without native hardware.
 */

export type DemoVoiceLevel = 'INFO' | 'ASSISTANCE' | 'EMERGENCY' | 'SILENT_SOS';

export type DemoCrashConfidence = 'OS_CONFIRMED' | 'SENSOR_SUSPECTED' | 'MANUAL';

const VOICE_REPLY = {
  INFO: '4DS security status is available in your app.',
  ASSISTANCE: '4DS assistance has been requested. Your security provider has been notified.',
  EMERGENCY: '4DS emergency alert activated. Assistance has been notified.',
  SILENT_SOS: '',
} as const;

function crashLabel(confidence: DemoCrashConfidence) {
  if (confidence === 'OS_CONFIRMED') return 'SEVERE VEHICULAR CRASH DETECTED';
  if (confidence === 'SENSOR_SUSPECTED') return 'POSSIBLE VEHICLE IMPACT DETECTED';
  return 'VEHICLE PANIC ACTIVATED';
}

function ok<T>(data: T) {
  return { success: true, data };
}

export type DemoIntegrationResult =
  | {
      handled: true;
      response: { success: boolean; data: unknown };
      incident?: {
        id: string;
        type: string;
        priority: string;
        title: string;
        status: string;
        isSilent: boolean;
        lat: number;
        lng: number;
        createdAt: string;
        user: string;
        publicRef?: string;
      };
      crNotification?: {
        id: string;
        category: string;
        title: string;
        body: string;
        priority: 'critical' | 'high' | 'medium' | 'low';
        isRead: boolean;
        createdAt: string;
        link: string;
      };
    }
  | { handled: false };

export function handleIntegrationsDemo(input: {
  clean: string;
  method: string;
  payload: Record<string, unknown>;
  userId?: string;
  tenantId?: string;
}): DemoIntegrationResult {
  const { clean, method: m, payload } = input;
  const userId = String(payload.userId ?? input.userId ?? 'demo-user-client-demo-local');
  const now = new Date().toISOString();

  if (clean === '/integrations/voice/config' && m === 'GET') {
    return {
      handled: true,
      response: ok({
        requireConfirmForEmergency: true,
        silentSosEnabled: false,
        silentPhrases: [],
      }),
    };
  }

  if (clean === '/integrations/crash/readiness' && m === 'GET') {
    return {
      handled: true,
      response: ok({
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
      }),
    };
  }

  const voiceMatch = clean.match(/^\/integrations\/voice\/([^/]+)\/webhook$/);
  if ((voiceMatch && m === 'POST') || (clean === '/integrations/voice/command' && m === 'POST')) {
    const platform = voiceMatch?.[1] ?? String(payload.platform ?? 'generic');
    const level = String(payload.level ?? 'EMERGENCY').toUpperCase() as DemoVoiceLevel;
    const confirmed = payload.confirmed === true;
    const requireConfirm = payload.requireConfirm !== false;

    if (level === 'INFO') {
      return {
        handled: true,
        response: ok({
          ok: true,
          level,
          incidentId: null,
          spokenReply: VOICE_REPLY.INFO,
          created: false,
        }),
      };
    }

    if (level === 'EMERGENCY' && requireConfirm && !confirmed) {
      return {
        handled: true,
        response: ok({
          ok: true,
          level,
          needsConfirmation: true,
          spokenReply: 'Do you want me to activate your 4DS emergency alert?',
          incidentId: null,
          created: false,
        }),
      };
    }

    if (level === 'SILENT_SOS' && payload.silentEnabled === false) {
      return {
        handled: true,
        response: ok({ ok: false, error: 'Silent voice SOS is not enabled for this account' }),
      };
    }

    const id = `demo-voice-${Date.now()}`;
    const publicRef = `NX-V${String(Date.now()).slice(-4)}`;
    const isSilent = level === 'SILENT_SOS';
    const title =
      level === 'ASSISTANCE'
        ? 'VOICE ASSISTANCE REQUEST'
        : isSilent
          ? 'SILENT VOICE SOS'
          : `VOICE SOS · ${platform.toUpperCase()}`;

    const incident = {
      id,
      type: 'PANIC',
      priority: level === 'ASSISTANCE' ? 'MEDIUM' : 'CRITICAL',
      title,
      status: 'ACTIVE',
      isSilent,
      lat: Number(payload.lat ?? -29.8587),
      lng: Number(payload.lng ?? 31.0218),
      createdAt: now,
      user: 'Nomsa Client',
      publicRef,
    };

    return {
      handled: true,
      response: ok({
        ok: true,
        level,
        incidentId: id,
        publicRef,
        spokenReply: isSilent ? String(payload.silentReply ?? '') : VOICE_REPLY[level] ?? VOICE_REPLY.EMERGENCY,
        created: true,
        correlated: false,
      }),
      incident,
      crNotification: {
        id: `demo-n-voice-${Date.now()}`,
        category: isSilent ? 'SILENT_PANIC' : 'PANIC',
        title: `${publicRef} · ${title}`,
        body: isSilent ? 'Silent voice SOS — covert response' : `Voice ${level} via ${platform}`,
        priority: level === 'ASSISTANCE' ? 'medium' : 'critical',
        isRead: false,
        createdAt: now,
        link: `/control-room/incidents?id=${id}`,
      },
    };
  }

  const crashMatch = clean.match(/^\/integrations\/crash\/([^/]+)\/webhook$/);
  if ((crashMatch && m === 'POST') || (clean === '/integrations/crash/event' && m === 'POST')) {
    const platform = crashMatch?.[1] ?? String(payload.platform ?? 'telematics');
    const confidence = String(payload.confidence ?? (platform.includes('apple') ? 'OS_CONFIRMED' : 'SENSOR_SUSPECTED')).toUpperCase() as DemoCrashConfidence;
    const label = crashLabel(
      confidence === 'OS_CONFIRMED' || confidence === 'SENSOR_SUSPECTED' || confidence === 'MANUAL'
        ? confidence
        : 'SENSOR_SUSPECTED',
    );
    const id = `demo-crash-${Date.now()}`;
    const publicRef = `NX-C${String(Date.now()).slice(-4)}`;
    const incident = {
      id,
      type: 'CRASH',
      priority: 'CRITICAL',
      title: label,
      status: 'ACTIVE',
      isSilent: false,
      lat: Number(payload.lat ?? -29.81),
      lng: Number(payload.lng ?? 31.04),
      createdAt: now,
      user: 'Nomsa Client',
      publicRef,
    };

    return {
      handled: true,
      response: ok({
        ok: true,
        incidentId: id,
        publicRef,
        label,
        confidence,
        created: true,
        correlated: false,
      }),
      incident,
      crNotification: {
        id: `demo-n-crash-${Date.now()}`,
        category: 'PANIC',
        title: `${publicRef} · ${label}`,
        body: `Crash via ${platform} · confidence ${confidence}`,
        priority: 'critical',
        isRead: false,
        createdAt: now,
        link: `/control-room/incidents?id=${id}`,
      },
    };
  }

  return { handled: false };
}
