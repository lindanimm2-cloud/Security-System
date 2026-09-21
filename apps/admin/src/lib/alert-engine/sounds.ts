/**
 * AlertEngine sound façade — delegates to Ops AudioManager.
 * Keeps existing AlertSoundId API for PriorityAlert / tests.
 */

import {
  alertSoundToCue,
  playCue,
  previewCue,
  stopAllCues,
  stopCue,
  unlockAudio,
} from '@/lib/ops-audio';
import type { AlertSoundId } from './types';

const LEGACY_LABELS: Record<AlertSoundId, string> = {
  panic: 'Critical panic / SOS',
  high: 'High-priority alert',
  medical: 'Medical alert',
  fire: 'Fire / alarm',
  theft: 'Vehicle panic / theft',
  officer_sos: 'Officer SOS',
  device_offline: 'Device / comms loss',
  message: 'New message',
  call: 'Incoming call',
  sla: 'SLA overdue',
  system: 'System',
  silent: 'Silent (haptic only)',
};

export function listAlertSounds() {
  return (Object.keys(LEGACY_LABELS) as AlertSoundId[]).map((id) => ({
    id,
    label: LEGACY_LABELS[id],
    loop: ['panic', 'fire', 'officer_sos', 'call'].includes(id),
  }));
}

export function previewAlertSound(id: AlertSoundId) {
  unlockAudio();
  previewCue(alertSoundToCue(id));
}

export function startAlertSound(alertId: string, soundId: AlertSoundId, opts?: { loop?: boolean }) {
  unlockAudio();
  playCue(alertSoundToCue(soundId), {
    instanceId: alertId,
    loop: opts?.loop,
    haptic: true,
  });
}

export function stopAlertSound(alertId: string) {
  stopCue(alertId);
}

export function stopAllAlertSounds() {
  stopAllCues();
}

/** After ACK — quieter repeating reminder instead of full SOS. */
export function startAckReminder(alertId: string, soundId: AlertSoundId) {
  unlockAudio();
  playCue(alertSoundToCue(soundId), {
    instanceId: `${alertId}-reminder`,
    loop: true,
    reminder: true,
    haptic: false,
  });
}

export function stopAckReminder(alertId: string) {
  stopCue(`${alertId}-reminder`);
}
