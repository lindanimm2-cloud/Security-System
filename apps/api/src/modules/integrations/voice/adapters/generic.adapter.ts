import type { VoiceAdapter, VoiceAdapterContext } from '../voice-adapter';
import type { VoiceCommandEvent, VoiceCommandLevel, VoicePlatform } from '../../events';

function asLevel(raw: unknown): VoiceCommandLevel {
  const v = String(raw ?? 'EMERGENCY').toUpperCase();
  if (v === 'INFO' || v === 'ASSISTANCE' || v === 'EMERGENCY' || v === 'SILENT_SOS') return v;
  if (v.includes('SILENT')) return 'SILENT_SOS';
  if (v.includes('ASSIST')) return 'ASSISTANCE';
  if (v.includes('INFO') || v.includes('STATUS')) return 'INFO';
  return 'EMERGENCY';
}

function point(payload: Record<string, unknown>) {
  const lat = Number(payload.lat ?? payload.latitude);
  const lng = Number(payload.lng ?? payload.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, accuracyM: payload.accuracyM != null ? Number(payload.accuracyM) : null };
}

export function createGenericVoiceAdapter(platform: VoicePlatform = 'generic'): VoiceAdapter {
  return {
    platform,
    normalize(payload, ctx?: VoiceAdapterContext): VoiceCommandEvent | null {
      const tenantId = String(payload.tenantId ?? ctx?.tenantId ?? '');
      const userId = String(payload.userId ?? ctx?.userId ?? '');
      if (!tenantId || !userId) return null;
      return {
        type: 'VOICE_COMMAND',
        level: asLevel(payload.level ?? payload.intent),
        platform,
        tenantId,
        userId,
        deviceId: payload.deviceId != null ? String(payload.deviceId) : null,
        accountId: payload.accountId != null ? String(payload.accountId) : null,
        propertyId: payload.propertyId != null ? String(payload.propertyId) : null,
        vehicleId: payload.vehicleId != null ? String(payload.vehicleId) : null,
        location: point(payload),
        requireConfirm: Boolean(payload.requireConfirm),
        silentReply: payload.silentReply != null ? String(payload.silentReply) : null,
        rawPhrase: payload.phrase != null ? String(payload.phrase) : payload.rawPhrase != null ? String(payload.rawPhrase) : null,
        occurredAt: payload.occurredAt != null ? String(payload.occurredAt) : new Date().toISOString(),
      };
    },
  };
}

export const genericVoiceAdapter = createGenericVoiceAdapter('generic');
export const alexaAdapter = createGenericVoiceAdapter('alexa');
export const googleHomeAdapter = createGenericVoiceAdapter('google-home');
export const siriAdapter = createGenericVoiceAdapter('siri');
export const smartThingsAdapter = createGenericVoiceAdapter('smartthings');
export const homeAssistantAdapter = createGenericVoiceAdapter('home-assistant');
export const matterAdapter = createGenericVoiceAdapter('matter');
