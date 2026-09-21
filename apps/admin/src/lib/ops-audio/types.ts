/**
 * 4DS Operations Audio + Haptics — shared language across Control Panel, mobile, watch.
 * Sounds are synthesized Web Audio by default (replaceable WAV/OGG later via asset registry).
 */

export type OpsAudioProfileId =
  | 'full'
  | 'standard'
  | 'quiet'
  | 'emergency_only'
  | 'test'
  | 'night'
  | 'radio'
  | 'silent';

export type AudioCueId =
  // UI
  | 'ui_click'
  | 'ui_toggle_on'
  | 'ui_toggle_off'
  | 'ui_save'
  | 'ui_error'
  | 'ui_navigation'
  | 'ui_cancel'
  // Communications
  | 'msg_received'
  | 'call_incoming'
  | 'radio_rx'
  | 'radio_tx'
  | 'radio_squelch'
  | 'radio_channel'
  | 'radio_ack'
  | 'connection_up'
  | 'connection_down'
  // Operations
  | 'task_new'
  | 'dispatch_new'
  | 'dispatch_ack'
  | 'en_route'
  | 'on_scene'
  | 'resolved'
  | 'warning'
  | 'critical_warning'
  | 'escalation'
  | 'device_offline'
  | 'system'
  // Emergency
  | 'panic'
  | 'silent_panic'
  | 'officer_sos'
  | 'vehicle_panic'
  | 'intrusion'
  | 'fire'
  | 'medical'
  | 'test_alert';

export type HapticPatternId =
  | 'tap'
  | 'confirmation'
  | 'warning'
  | 'critical'
  | 'sos'
  | 'sos_stealth'
  | 'success'
  | 'connection'
  | 'error'
  | 'call_ring'
  | 'medical'
  | 'fire'
  | 'test';

export type ToneStep = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gap?: number;
  gain?: number;
};

export type AudioCueDef = {
  id: AudioCueId;
  label: string;
  group: 'ui' | 'communication' | 'operations' | 'emergency';
  loop: boolean;
  /** Severity for profile gating */
  severity: 'ui' | 'normal' | 'important' | 'warning' | 'critical' | 'emergency';
  pattern: ToneStep[];
  /** Soft reminder pattern after ACK (emergency only) */
  ackReminder?: ToneStep[];
  haptic?: HapticPatternId;
};

export type HapticDef = {
  id: HapticPatternId;
  label: string;
  /** navigator.vibrate pattern in ms */
  pattern: number[];
  repeats?: number;
};

export type OpsAudioPrefs = {
  profile: OpsAudioProfileId;
  masterVolume: number; // 0–1
  uiSounds: boolean;
  hapticsEnabled: boolean;
  radioFlavour: boolean;
  /** P1/SOS cannot be permanently killed by Quiet / Emergency Only profiles */
  p1AlwaysAudible: boolean;
};

export const OPS_AUDIO_PREFS_KEY = '4ds-ops-audio-prefs';
export const OPS_AUDIO_CHANGED = '4ds-ops-audio-changed';
