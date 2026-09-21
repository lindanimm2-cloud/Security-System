import { AUDIO_CATALOG } from './catalog';
import { playHaptic } from './haptic-manager';
import { cueAllowedByProfile, loadOpsAudioPrefs, volumeForCue } from './profiles';
import type { AudioCueId, ToneStep } from './types';

let sharedCtx: AudioContext | null = null;
const loopTimers = new Map<string, number>();

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctor();
  if (sharedCtx.state === 'suspended') void sharedCtx.resume().catch(() => undefined);
  return sharedCtx;
}

function playPatternOnce(
  ctx: AudioContext,
  pattern: ToneStep[],
  volumeScale: number,
  startAt = 0,
): number {
  let t = ctx.currentTime + startAt;
  for (const step of pattern) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = step.type ?? 'sine';
    osc.frequency.value = step.freq;
    const g = Math.max(0.0001, (step.gain ?? 0.04) * volumeScale);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(g, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + step.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + step.duration + 0.02);
    t += step.duration + (step.gap ?? 0.05);
  }
  return Math.max(0, t - ctx.currentTime);
}

export function unlockAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume();
}

export function stopCue(instanceId: string) {
  const timer = loopTimers.get(instanceId);
  if (timer) {
    window.clearTimeout(timer);
    loopTimers.delete(instanceId);
  }
}

export function stopAllCues() {
  for (const id of [...loopTimers.keys()]) stopCue(id);
}

/**
 * Play a named cue. instanceId lets emergency loops be stopped / swapped to ACK reminder.
 */
export function playCue(
  cueId: AudioCueId,
  opts?: {
    instanceId?: string;
    loop?: boolean;
    force?: boolean;
    haptic?: boolean;
    reminder?: boolean;
  },
) {
  const prefs = loadOpsAudioPrefs();
  const def = AUDIO_CATALOG[cueId];
  if (!def) return;

  if (!cueAllowedByProfile(def, prefs, { force: opts?.force })) {
    // Emergency still gets haptic when profile allows P1 through haptic-only? 
    // If audio blocked but emergency + p1AlwaysAudible, cueAllowed returns true.
    return;
  }

  const instanceId = opts?.instanceId ?? cueId;
  stopCue(instanceId);

  const pattern =
    opts?.reminder && def.ackReminder?.length ? def.ackReminder : def.pattern;

  if (opts?.haptic !== false && def.haptic) {
    playHaptic(def.haptic, { force: opts?.force });
  }

  if (!pattern.length) return;

  const ctx = getCtx();
  if (!ctx) return;
  const vol = volumeForCue(def, prefs);
  const shouldLoop = opts?.loop ?? (opts?.reminder ? true : def.loop);

  // Radio flavour prefix for dispatch / ACK when enabled
  if (
    prefs.radioFlavour &&
    (prefs.profile === 'radio' || prefs.profile === 'full') &&
    (cueId === 'dispatch_new' || cueId === 'dispatch_ack' || cueId === 'radio_ack')
  ) {
    const squelch = AUDIO_CATALOG.radio_squelch?.pattern;
    if (squelch?.length) playPatternOnce(ctx, squelch, vol * 0.8);
  }

  const cycle = () => {
    const duration = playPatternOnce(ctx, pattern, vol, prefs.radioFlavour && cueId.startsWith('dispatch') ? 0.06 : 0);
    if (shouldLoop) {
      const pauseMs = opts?.reminder ? 2200 : Math.max(350, duration * 1000 + 80);
      const timer = window.setTimeout(cycle, pauseMs);
      loopTimers.set(instanceId, timer);
    }
  };
  cycle();
}

export function previewCue(cueId: AudioCueId) {
  playCue(cueId, { force: true, loop: false, instanceId: `preview-${cueId}` });
}

/** Map legacy AlertEngine sound ids → ops cues */
export function alertSoundToCue(
  soundId: string,
): AudioCueId {
  const map: Record<string, AudioCueId> = {
    panic: 'panic',
    high: 'critical_warning',
    medical: 'medical',
    fire: 'fire',
    theft: 'vehicle_panic',
    officer_sos: 'officer_sos',
    device_offline: 'device_offline',
    message: 'msg_received',
    call: 'call_incoming',
    sla: 'critical_warning',
    system: 'system',
    silent: 'silent_panic',
  };
  return map[soundId] ?? 'system';
}
