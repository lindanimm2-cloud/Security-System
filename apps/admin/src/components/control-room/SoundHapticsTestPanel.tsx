'use client';

import { useEffect, useState } from 'react';
import {
  AUDIO_LICENSE_REGISTRY,
  PROFILE_LABELS,
  getSoundHapticReadiness,
  listAudioCuesByGroup,
  listHapticPatterns,
  loadOpsAudioPrefs,
  playHaptic,
  previewCue,
  saveOpsAudioPrefs,
  unlockAudio,
  type AudioCueId,
  type OpsAudioPrefs,
  type OpsAudioProfileId,
} from '@/lib/ops-audio';

const PROFILE_ORDER: OpsAudioProfileId[] = [
  'full',
  'standard',
  'quiet',
  'emergency_only',
  'night',
  'radio',
  'test',
  'silent',
];

export function SoundHapticsTestPanel() {
  const [prefs, setPrefs] = useState<OpsAudioPrefs>(() => loadOpsAudioPrefs());
  const [note, setNote] = useState('');
  const readiness = getSoundHapticReadiness();

  useEffect(() => {
    function sync() {
      setPrefs(loadOpsAudioPrefs());
    }
    window.addEventListener('4ds-ops-audio-changed', sync);
    return () => window.removeEventListener('4ds-ops-audio-changed', sync);
  }, []);

  function patch(next: Partial<OpsAudioPrefs>) {
    setPrefs(saveOpsAudioPrefs(next));
  }

  function play(id: AudioCueId, label: string) {
    unlockAudio();
    previewCue(id);
    setNote(`Playing · ${label}`);
  }

  return (
    <section className="portal-card settings-panel ops-audio-panel">
      <div className="settings-panel__head">
        <div>
          <p className="settings-panel__eyebrow">Sound &amp; Haptics</p>
          <h2>Operations audio language</h2>
          <p className="text-muted">
            Consistent cues across Control Panel, mobile, and watch. Synthesized tones now — replaceable
            assets later with license provenance. P1 / SOS cannot be permanently muted by Quiet or
            Emergency Only profiles.
          </p>
        </div>
      </div>

      <div className="ops-audio-readiness">
        <p className="dash-ops__eyebrow">Device readiness</p>
        <ul>
          {readiness.items.map((item) => (
            <li key={item.id}>
              <span>{item.ok ? '✓' : '○'}</span>
              <strong>{item.label}</strong>
              <em>{item.detail}</em>
            </li>
          ))}
        </ul>
        <p className={`ops-audio-readiness__status ${readiness.ready ? 'is-ready' : ''}`}>
          STATUS · {readiness.statusLabel}
        </p>
      </div>

      <div className="ops-audio-profiles">
        <p className="dash-ops__eyebrow">Alert profile</p>
        <div className="em-vib__chips">
          {PROFILE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={prefs.profile === id ? 'btn-sm btn-primary' : 'btn-sm btn-secondary'}
              onClick={() => patch({ profile: id })}
            >
              {PROFILE_LABELS[id].label}
            </button>
          ))}
        </div>
        <p className="text-muted">{PROFILE_LABELS[prefs.profile].detail}</p>
      </div>

      <div className="ops-audio-toggles">
        <label>
          <input
            type="checkbox"
            checked={prefs.uiSounds}
            onChange={(e) => patch({ uiSounds: e.target.checked })}
          />
          UI sounds
        </label>
        <label>
          <input
            type="checkbox"
            checked={prefs.hapticsEnabled}
            onChange={(e) => patch({ hapticsEnabled: e.target.checked })}
          />
          Haptics / vibration
        </label>
        <label>
          <input
            type="checkbox"
            checked={prefs.radioFlavour}
            onChange={(e) => patch({ radioFlavour: e.target.checked })}
          />
          Radio flavour
        </label>
        <label>
          <input
            type="checkbox"
            checked={prefs.p1AlwaysAudible}
            onChange={(e) => patch({ p1AlwaysAudible: e.target.checked })}
          />
          P1 always audible (recommended)
        </label>
        <label className="ops-audio-vol">
          Master volume
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(prefs.masterVolume * 100)}
            onChange={(e) => patch({ masterVolume: Number(e.target.value) / 100 })}
          />
        </label>
      </div>

      {(
        [
          ['ui', 'Test UI'],
          ['communication', 'Test communication'],
          ['operations', 'Test operations'],
          ['emergency', 'Test emergency'],
        ] as const
      ).map(([group, title]) => (
        <div key={group} className="ops-audio-tests">
          <p className="dash-ops__eyebrow">{title}</p>
          <div className="em-vib__chips">
            {listAudioCuesByGroup(group).map((cue) => (
              <button
                key={cue.id}
                type="button"
                className="btn-sm btn-secondary"
                onClick={() => play(cue.id, cue.label)}
              >
                ▶ {cue.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="ops-audio-tests">
        <p className="dash-ops__eyebrow">Test haptics</p>
        <div className="em-vib__chips">
          {listHapticPatterns().map((h) => (
            <button
              key={h.id}
              type="button"
              className="btn-sm btn-secondary"
              onClick={() => {
                const ok = playHaptic(h.id, { force: true });
                setNote(ok ? `Vibrate · ${h.label}` : `No vibrate API · ${h.label}`);
              }}
            >
              📳 {h.label}
            </button>
          ))}
        </div>
      </div>

      {note ? <p className="sec-article__note">{note}</p> : null}

      <p className="text-muted ops-audio-license">
        License registry: {AUDIO_LICENSE_REGISTRY.length} record(s) · current pack is internal Web
        Audio synthesis. Do not add third-party files without provenance.
      </p>
    </section>
  );
}
