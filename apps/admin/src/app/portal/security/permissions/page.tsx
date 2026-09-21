'use client';

import Link from 'next/link';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useEmergencyPermissions } from '@/hooks/useEmergencyPermissions';
import { runtimeNote } from '@/lib/emergency-permissions';
import {
  VIBRATION_PROFILES,
  previewVibration,
  vibrationSupported,
  type VibrationProfileId,
} from '@/lib/emergency-vibration';
import { detectWebNativeSos, NATIVE_SOS_DISCLAIMER } from '@/lib/device-security';
import { clientApi } from '@/lib/api-client';
import { useEffect, useState } from 'react';

const VOICE_PREFS_KEY = '4ds-voice-sos-prefs';

type VoicePrefs = {
  requireConfirmForEmergency: boolean;
  silentSosEnabled: boolean;
};

function loadVoicePrefs(): VoicePrefs {
  if (typeof window === 'undefined') {
    return { requireConfirmForEmergency: true, silentSosEnabled: false };
  }
  try {
    const raw = localStorage.getItem(VOICE_PREFS_KEY);
    if (!raw) return { requireConfirmForEmergency: true, silentSosEnabled: false };
    const parsed = JSON.parse(raw) as Partial<VoicePrefs>;
    return {
      requireConfirmForEmergency: parsed.requireConfirmForEmergency !== false,
      silentSosEnabled: Boolean(parsed.silentSosEnabled),
    };
  } catch {
    return { requireConfirmForEmergency: true, silentSosEnabled: false };
  }
}

function saveVoicePrefs(next: VoicePrefs) {
  localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(next));
}

function VoiceCrashSettings() {
  const [prefs, setPrefs] = useState<VoicePrefs>(() => loadVoicePrefs());
  const [readiness, setReadiness] = useState<{
    message?: string;
    fallbacks?: string[];
    appleCrashDetection?: string;
  } | null>(null);
  const [savedNote, setSavedNote] = useState('');

  useEffect(() => {
    void clientApi
      .get<{ success: boolean; data: typeof readiness }>('/integrations/crash/readiness')
      .then((res) => setReadiness(res.data ?? null))
      .catch(() =>
        setReadiness({
          appleCrashDetection: 'unavailable',
          message:
            'Crash Detection integration unavailable on this web client. Apple SafetyKit requires a native iOS app with the severe-vehicular-crash-event entitlement.',
          fallbacks: ['Manual SOS', 'Vehicle panic', 'Location sharing', 'Push alerts'],
        }),
      );
    void clientApi
      .get<{ success: boolean; data: VoicePrefs }>('/integrations/voice/config')
      .then((res) => {
        if (res.data) {
          const next = {
            requireConfirmForEmergency: res.data.requireConfirmForEmergency !== false,
            silentSosEnabled: Boolean(res.data.silentSosEnabled),
          };
          setPrefs(next);
          saveVoicePrefs(next);
        }
      })
      .catch(() => undefined);
  }, []);

  function patch(partial: Partial<VoicePrefs>) {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    saveVoicePrefs(next);
    setSavedNote('Voice SOS preferences saved on this device.');
  }

  return (
    <>
      <p>
        Voice assistants and Crash Detection feed the same Incident Kernel as in-app Panic. They never
        create a parallel SOS system. 4DS does not dial public emergency services via Apple SafetyKit.
      </p>

      <div className="em-vib__toggles">
        <label className="em-vib__toggle">
          <input
            type="checkbox"
            checked={prefs.requireConfirmForEmergency}
            onChange={(e) => patch({ requireConfirmForEmergency: e.target.checked })}
          />
          Require spoken confirmation before Voice Emergency SOS
        </label>
        <label className="em-vib__toggle">
          <input
            type="checkbox"
            checked={prefs.silentSosEnabled}
            onChange={(e) => {
              if (e.target.checked) {
                const ok = window.confirm(
                  'Silent voice SOS can alert control room without announcing an emergency on your speaker. Enable only if you understand the risk of accidental activation. Continue?',
                );
                if (!ok) return;
              }
              patch({ silentSosEnabled: e.target.checked });
            }}
          />
          Enable silent voice SOS phrases (explicit consent)
        </label>
      </div>
      {prefs.silentSosEnabled ? (
        <p className="sec-article__note">
          Silent phrases never announce SOS aloud. Use a benign reply only. Accidental activations still
          create a real incident for your security company.
        </p>
      ) : null}
      {savedNote ? <p className="sec-article__note">{savedNote}</p> : null}

      <p className="em-vib__slot-label" style={{ marginTop: '1rem' }}>
        Crash Detection readiness
      </p>
      <p>
        <StatusBadge
          status={
            readiness?.appleCrashDetection === 'ok'
              ? 'Authorized'
              : readiness?.appleCrashDetection === 'warn'
                ? 'Limited'
                : 'Unavailable'
          }
          tone={readiness?.appleCrashDetection === 'ok' ? 'success' : 'warning'}
        />
      </p>
      <p className="sec-article__note">
        {readiness?.message ??
          'Crash Detection integration unavailable — never green-check without OS authorization.'}
      </p>
      {readiness?.fallbacks?.length ? (
        <ul className="sec-article__list">
          {readiness.fallbacks.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function statusLabel(state: string): string {
  if (state === 'granted') return 'Enabled';
  if (state === 'denied') return 'Blocked';
  if (state === 'unsupported') return 'Native only';
  if (state === 'checking') return 'Checking…';
  return 'Not enabled';
}

function statusClass(state: string): string {
  if (state === 'granted') return 'portal-perm__status--ok';
  if (state === 'denied') return 'portal-perm__status--bad';
  if (state === 'unsupported') return 'portal-perm__status--muted';
  return 'portal-perm__status--warn';
}

export default function EmergencyPermissionsPage() {
  return (
    <PortalLayout>
      <EmergencyPermissionsContent />
    </PortalLayout>
  );
}

function EmergencyPermissionsContent() {
  const sos = detectWebNativeSos();
  const { access, loading } = useSubscriptionAccess();
  const {
    rows,
    recommended,
    optional,
    requesting,
    prefs,
    allow,
    allowRecommended,
    updatePrefs,
    setupBusy,
    missingRequired,
  } = useEmergencyPermissions(access);
  const [mode, setMode] = useState<'EMERGENCY_ONLY' | 'OFF' | 'CONTINUOUS'>('EMERGENCY_ONLY');
  const [duress, setDuress] = useState(false);
  const [previewNote, setPreviewNote] = useState('');

  if (loading || !access) {
    return (
      <div className="page-content">
        <p className="text-muted">Loading permissions…</p>
      </div>
    );
  }

  function setProfile(slot: 'panicProfile' | 'criticalProfile' | 'normalProfile', id: VibrationProfileId) {
    updatePrefs({ [slot]: id });
    const ok = previewVibration(id);
    setPreviewNote(ok ? `Previewed ${id} pattern` : 'Vibration not available on this device');
  }

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="SCH-PERM-01"
        kicker="Schedule C"
        title="Emergency permissions"
        summary="Permission architecture for reliable emergency response — web uses what the browser allows; native apps map the same controls to full OS channels."
        toc={[
          { id: 'setup', label: 'Emergency setup' },
          { id: 'status', label: 'Permission status' },
          { id: 'vibration', label: 'Vibration profiles' },
          { id: 'voice-crash', label: 'Voice SOS & Crash' },
          { id: 'native', label: 'Native SOS' },
          { id: 'location', label: 'Location privacy' },
          { id: 'duress', label: 'Duress' },
          { id: 'file', label: 'Protection file', href: '/portal/security' },
        ]}
      >
        <SecurityArticle id="setup" number="01" title="Emergency setup">
          <p>
            Don&apos;t dump ten system prompts at once. Use the guided setup, then refine vibration and
            optional capabilities here.
          </p>
          <div className="sec-device__actions em-perm__setup-actions">
            <Link href="/portal/security/emergency-setup" className="btn-primary">
              Open emergency setup
            </Link>
            <button
              type="button"
              className="btn-secondary"
              disabled={setupBusy}
              onClick={() => void allowRecommended()}
            >
              {setupBusy ? 'Enabling…' : 'Enable recommended now'}
            </button>
          </div>
          {missingRequired.length > 0 ? (
            <p className="sec-article__note">
              {missingRequired.map((m) => m.label).join(', ')} still need attention for full
              protection.
            </p>
          ) : (
            <p className="sec-article__note">Recommended emergency permissions look healthy on this device.</p>
          )}
        </SecurityArticle>

        <SecurityArticle id="status" number="02" title="Permission status">
          <section id="emergency-permissions" className="portal-card profile-section portal-permissions em-perm-panel">
            <div className="card-header-row">
              <div>
                <h2>Device &amp; emergency capabilities</h2>
                <p className="text-muted portal-permissions__lead">
                  Status for each capability 4DS uses during panic, medical, fire, and live response.
                </p>
              </div>
            </div>

            <p className="dash-ops__eyebrow">Recommended</p>
            <ul className="portal-permissions__list">
              {recommended.map((row) => (
                <li key={row.id} className="portal-permissions__item">
                  <div className="portal-permissions__copy">
                    <strong>
                      <span aria-hidden>{row.icon} </span>
                      {row.label}
                      {row.required ? null : <span className="sec-optional"> Optional</span>}
                    </strong>
                    <p className="text-muted">{row.why}</p>
                    <span className="portal-permissions__for">{runtimeNote(row)}</span>
                  </div>
                  <div className="portal-permissions__actions">
                    <span className={`portal-perm__status ${statusClass(row.state)}`}>
                      {statusLabel(row.state)}
                    </span>
                    {row.state !== 'granted' && row.state !== 'unsupported' ? (
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        disabled={requesting === row.id}
                        onClick={() => void allow(row.id)}
                      >
                        {requesting === row.id ? '…' : 'Enable'}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {optional.length > 0 ? (
              <>
                <p className="dash-ops__eyebrow" style={{ marginTop: '1.25rem' }}>
                  Optional
                </p>
                <ul className="portal-permissions__list">
                  {optional.map((row) => (
                    <li key={row.id} className="portal-permissions__item">
                      <div className="portal-permissions__copy">
                        <strong>
                          <span aria-hidden>{row.icon} </span>
                          {row.label}
                        </strong>
                        <p className="text-muted">{row.why}</p>
                        <span className="portal-permissions__for">{runtimeNote(row)}</span>
                      </div>
                      <div className="portal-permissions__actions">
                        <span className={`portal-perm__status ${statusClass(row.state)}`}>
                          {statusLabel(row.state)}
                        </span>
                        {row.state !== 'granted' && row.state !== 'unsupported' ? (
                          <button
                            type="button"
                            className="btn-sm btn-secondary"
                            disabled={requesting === row.id}
                            onClick={() => void allow(row.id)}
                          >
                            {requesting === row.id ? '…' : 'Enable'}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </SecurityArticle>

        <SecurityArticle id="vibration" number="03" title="Vibration profiles">
          <p>
            {vibrationSupported()
              ? 'Choose how this device feels emergency alerts. Patterns also travel in the push payload for a future native app.'
              : 'This browser does not expose vibration. Preferences are still saved for a native Android/iOS install.'}
          </p>
          <p className="sec-article__note">
            Control Room operators: full Sound &amp; Haptics test centre lives under{' '}
            <Link href="/control-room/settings">Settings → Alerts</Link> (ops audio language +
            profiles).
          </p>

          <div className="em-vib__toggles">
            <label className="em-vib__toggle">
              <input
                type="checkbox"
                checked={prefs.vibrationEnabled}
                onChange={(e) => updatePrefs({ vibrationEnabled: e.target.checked })}
              />
              Emergency vibration
            </label>
            <label className="em-vib__toggle">
              <input
                type="checkbox"
                checked={prefs.soundEnabled}
                onChange={(e) => updatePrefs({ soundEnabled: e.target.checked })}
              />
              Emergency alert sound
            </label>
          </div>

          {(
            [
              ['panicProfile', 'Panic / P0', prefs.panicProfile],
              ['criticalProfile', 'Critical updates', prefs.criticalProfile],
              ['normalProfile', 'Normal notifications', prefs.normalProfile],
            ] as const
          ).map(([slot, label, current]) => (
            <div key={slot} className="em-vib__slot">
              <p className="em-vib__slot-label">{label}</p>
              <div className="em-vib__chips">
                {VIBRATION_PROFILES.filter((p) => p.id !== 'off' || slot !== 'panicProfile').map((p) => (
                  <button
                    key={`${slot}-${p.id}`}
                    type="button"
                    className={current === p.id ? 'btn-sm btn-primary' : 'btn-sm btn-secondary'}
                    onClick={() => setProfile(slot, p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-muted em-vib__desc">
                {VIBRATION_PROFILES.find((p) => p.id === current)?.description}
              </p>
            </div>
          ))}
          {previewNote ? <p className="sec-article__note">{previewNote}</p> : null}
        </SecurityArticle>

        <SecurityArticle id="voice-crash" number="04" title="Voice SOS & Crash Detection">
          <VoiceCrashSettings />
        </SecurityArticle>

        <SecurityArticle id="native" number="05" title="Native Emergency SOS">
          <p>
            <StatusBadge status="Not available" tone="warning" /> on this web application.
          </p>
          <p>{sos.note}</p>
          <p className="sec-article__note">{NATIVE_SOS_DISCLAIMER}</p>
          <p className="sec-article__note">
            Use <Link href="/portal/protect">Protect</Link>,{' '}
            <Link href="/portal/security/emergency-access">Emergency access</Link>, or Call control
            room instead. The permission ids above are designed so a native app can unlock full SOS
            channels without rebuilding this screen.
          </p>
        </SecurityArticle>

        <SecurityArticle id="location" number="06" title="Location privacy">
          <p>Do not enable continuous tracking unless your contracted service requires it.</p>
          <div className="sec-device__actions">
            {(['OFF', 'EMERGENCY_ONLY', 'CONTINUOUS'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={mode === value ? 'btn-primary' : 'btn-secondary'}
                onClick={() => {
                  setMode(value);
                  void clientApi.post('/client/security/settings', { trackingMode: value });
                }}
              >
                {value === 'OFF' ? 'Off' : value === 'EMERGENCY_ONLY' ? 'Emergency only' : 'Continuous'}
              </button>
            ))}
          </div>
        </SecurityArticle>

        <SecurityArticle id="duress" number="07" title="Duress protection">
          <p>
            Optional. If enabled, a configured duress authentication can silently notify the control
            room. This must not create false confidence. You can disable it at any time.
          </p>
          <button
            type="button"
            className={duress ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              const next = !duress;
              setDuress(next);
              void clientApi.post('/client/security/settings', { duressEnabled: next });
            }}
          >
            {duress ? 'Duress enabled' : 'Enable duress protection'}
          </button>
        </SecurityArticle>
      </SecurityDocFrame>

      {/* keep rows referenced for a11y / future diagnostics */}
      <span className="sr-only">{rows.length} permissions tracked</span>
    </div>
  );
}
