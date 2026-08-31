'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UiSelect } from '@/components/ui/UiSelect';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import {
  CR_SETTINGS_CHANGED_EVENT,
  loadCrSettings,
  saveCrSettings,
  withAudit,
  type CrSettings,
} from '@/lib/control-room-settings';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { exportCsv } from '@/lib/export-csv';
import { getCompanyProfile } from '@/lib/company-profile';
import { openBrandedDocument } from '@/lib/branded-document';

type Branch = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  teams: { id: string; name: string; members: unknown[] }[];
  _count: { users: number; officers: number };
};

function Switch({
  checked,
  label,
  hint,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  hint?: string;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`settings-switch ${checked ? 'settings-switch--on' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <span className="settings-switch__copy">
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className="settings-switch__control" aria-hidden>
        <span className="settings-switch__track">
          <span className="settings-switch__thumb" />
        </span>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function SaveBar({ saved, saving, onSave }: { saved: boolean; saving?: boolean; onSave: () => void }) {
  return (
    <div className="settings-savebar">
      <button type="button" className="btn-primary btn-sm" disabled={saving} onClick={onSave}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      {saved ? (
        <span className="text-muted" role="status">
          Saved
        </span>
      ) : null}
    </div>
  );
}

export function SettingsCategoryPanels({
  section,
  canGrantRevenue,
  revenueBusy,
  revenueErr,
  revenueMsg,
  onRevenue,
}: {
  section: string;
  canGrantRevenue: boolean;
  revenueBusy: boolean;
  revenueErr: string;
  revenueMsg: string;
  onRevenue: (enabled: boolean) => void;
}) {
  const session = getSession('admin');
  const actor = session ? `${session.user.firstName} ${session.user.lastName}` : 'Control room';
  const [settings, setSettings] = useState<CrSettings>(() => loadCrSettings());
  const [saved, setSaved] = useState('');

  useEffect(() => {
    setSettings(loadCrSettings());
  }, [section]);

  useEffect(() => {
    function sync() {
      setSettings(loadCrSettings());
    }
    window.addEventListener(CR_SETTINGS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CR_SETTINGS_CHANGED_EVENT, sync);
  }, []);

  function commit(next: CrSettings, module: string, title: string, detail: string) {
    const withLog = withAudit(next, module, title, detail, actor);
    setSettings(withLog);
    saveCrSettings(withLog);
    setSaved(module);
    window.setTimeout(() => setSaved((cur) => (cur === module ? '' : cur)), 1800);
  }

  if (section === 'general') {
    const g = settings.general;
    return (
      <section className="portal-card settings-panel">
        <div className="settings-panel__head">
          <div>
            <p className="settings-panel__eyebrow">General</p>
            <h2>Control room defaults</h2>
            <p className="text-muted">Timezone, map centre and operator workstation behaviour.</p>
          </div>
        </div>
        <div className="settings-inline-grid">
          <label className="settings-inline-field">
            Timezone
            <UiSelect
              compact={false}
              ariaLabel="Timezone"
              value={g.timezone}
              onChange={(timezone) => setSettings({ ...settings, general: { ...g, timezone } })}
              options={[
                { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
                { value: 'Africa/Harare', label: 'Africa/Harare (CAT)' },
                { value: 'UTC', label: 'UTC' },
              ]}
            />
          </label>
          <label className="settings-inline-field">
            Language
            <UiSelect
              compact={false}
              ariaLabel="Language"
              value={g.language}
              onChange={(language) => setSettings({ ...settings, general: { ...g, language } })}
              options={[
                { value: 'en-ZA', label: 'English (South Africa)' },
                { value: 'zu-ZA', label: 'isiZulu' },
                { value: 'af-ZA', label: 'Afrikaans' },
              ]}
            />
          </label>
          <label className="settings-inline-field">
            Default map centre
            <input
              value={g.defaultMap}
              onChange={(e) => setSettings({ ...settings, general: { ...g, defaultMap: e.target.value } })}
            />
          </label>
          <label className="settings-inline-field">
            Shift handover
            <input
              type="time"
              value={g.handoverTime}
              onChange={(e) => setSettings({ ...settings, general: { ...g, handoverTime: e.target.value } })}
            />
          </label>
        </div>
        <div className="settings-switch-list">
          <Switch
            checked={g.clock24h}
            label="24-hour clock"
            hint="Incident times and the header clock"
            onChange={(clock24h) => setSettings({ ...settings, general: { ...g, clock24h } })}
          />
          <Switch
            checked={g.panicSound}
            label="Play panic tone"
            hint="Audible cue on critical alerts in this browser"
            onChange={(panicSound) => setSettings({ ...settings, general: { ...g, panicSound } })}
          />
          <Switch
            checked={g.compactTables}
            label="Compact tables"
            hint="Tighter row height on dispatch and customer lists"
            onChange={(compactTables) => setSettings({ ...settings, general: { ...g, compactTables } })}
          />
        </div>
        <SaveBar
          saved={saved === 'General'}
          onSave={() => commit(settings, 'General', 'General defaults updated', `Timezone ${g.timezone} · map ${g.defaultMap}`)}
        />
      </section>
    );
  }

  if (section === 'lens') {
    const lens = settings.lens;
    return (
      <section className="portal-card settings-panel">
        <div className="settings-panel__head">
          <div>
            <p className="settings-panel__eyebrow">Control Room</p>
            <h2>Critical Quick Actions Lens</h2>
            <p className="text-muted">
              Workstation behaviour for the Eye. Panic and P1 visibility are required by company policy.
            </p>
          </div>
        </div>
        <div className="settings-switch-list">
          <Switch
            checked={lens.enabled}
            label="Show Lens"
            hint="Hide the command dock when the board is calm. Active panic still forces the Lens on."
            onChange={(enabled) => setSettings({ ...settings, lens: { ...lens, enabled } })}
          />
          <Switch
            checked
            disabled
            label="Show Panic"
            hint="Required by company policy"
            onChange={() => undefined}
          />
          <Switch
            checked
            disabled
            label="Show P1"
            hint="Required by company policy"
            onChange={() => undefined}
          />
          <Switch
            checked={lens.showSla}
            label="Show SLA breaches"
            hint="Include overdue critical SLAs in the Lens queue"
            onChange={(showSla) => setSettings({ ...settings, lens: { ...lens, showSla } })}
          />
          <Switch
            checked={lens.showOpsAlerts}
            label="Show operational alerts"
            hint="Surface critical operational alerts in the Lens, not routine notifications"
            onChange={(showOpsAlerts) => setSettings({ ...settings, lens: { ...lens, showOpsAlerts } })}
          />
          <Switch
            checked={lens.autoPeek}
            label="Auto-peek P1"
            hint="Briefly preview a new Panic or P1, then return to the badge"
            onChange={(autoPeek) => setSettings({ ...settings, lens: { ...lens, autoPeek } })}
          />
          <Switch
            checked={lens.soundPanic}
            label="Sound on Panic"
            hint="Short tone for Panic, P1 and critical SLA. Not used for routine notifications."
            onChange={(soundPanic) => setSettings({ ...settings, lens: { ...lens, soundPanic } })}
          />
        </div>
        <div className="settings-inline-grid">
          <label className="settings-inline-field">
            Auto-collapse
            <UiSelect
              compact={false}
              ariaLabel="Auto-collapse"
              value={lens.autoCollapse}
              onChange={(autoCollapse) =>
                setSettings({
                  ...settings,
                  lens: { ...lens, autoCollapse: autoCollapse as CrSettings['lens']['autoCollapse'] },
                })
              }
              options={[
                { value: '5', label: '5 seconds' },
                { value: '10', label: '10 seconds' },
                { value: 'never', label: 'Never' },
              ]}
            />
          </label>
          <label className="settings-inline-field">
            Position
            <UiSelect
              compact={false}
              ariaLabel="Lens position"
              value={lens.dockEdge}
              onChange={(dockEdge) =>
                setSettings({
                  ...settings,
                  lens: { ...lens, dockEdge: dockEdge as CrSettings['lens']['dockEdge'] },
                })
              }
              options={[
                { value: 'top', label: 'Top' },
                { value: 'bottom', label: 'Bottom' },
              ]}
            />
          </label>
        </div>
        <SaveBar
          saved={saved === 'Lens'}
          onSave={() =>
            commit(
              settings,
              'Lens',
              'Critical Quick Actions Lens updated',
              `Show ${lens.enabled ? 'on' : 'off'} · collapse ${lens.autoCollapse} · ${lens.dockEdge}`,
            )
          }
        />
      </section>
    );
  }

  if (section === 'notifications') {
    const n = settings.notifications;
    const channelCount = [n.bell, n.sms, n.radio, n.email].filter(Boolean).length;
    const patch = (partial: Partial<CrSettings['notifications']>) =>
      setSettings({ ...settings, notifications: { ...n, ...partial } });

    return (
      <section className="portal-card settings-panel">
        <div className="settings-panel__head">
          <div>
            <p className="settings-panel__eyebrow">Notifications</p>
            <h2>Operator channels</h2>
            <p className="text-muted">
              Choose how this desk receives routine and critical events. Panic can still bypass quiet hours.
            </p>
          </div>
          <div className="settings-panel__meta">
            <span className="settings-pill">{channelCount}/4 channels</span>
            <span className={`settings-pill ${n.quietHours ? 'settings-pill--muted' : 'settings-pill--live'}`}>
              {n.quietHours ? `Quiet ${n.quietFrom}–${n.quietTo}` : 'Always on'}
            </span>
          </div>
        </div>

        <div className="settings-notify">
          <div className="settings-notify__block">
            <div className="settings-notify__block-head">
              <h3>Delivery</h3>
              <p>Where alerts land for operators on this desk.</p>
            </div>
            <div className="settings-switch-grid">
              <Switch checked={n.bell} label="Notification bell" hint="In-app inbox" onChange={(bell) => patch({ bell })} />
              <Switch checked={n.sms} label="SMS to on-duty phones" hint="Critical and high only" onChange={(sms) => patch({ sms })} />
              <Switch checked={n.radio} label="Radio dispatch cue" hint="Short tone on assigned channel" onChange={(radio) => patch({ radio })} />
              <Switch checked={n.email} label="Email digest" hint="Hourly non-critical summary" onChange={(email) => patch({ email })} />
            </div>
          </div>

          <div className={`settings-notify__block settings-notify__quiet ${n.quietHours ? 'is-active' : ''}`}>
            <div className="settings-notify__block-head">
              <h3>Quiet hours</h3>
              <p>Mute routine noise overnight without missing life-safety alerts.</p>
            </div>
            <div className="settings-switch-list settings-switch-list--flush">
              <Switch
                checked={n.quietHours}
                label="Enable quiet hours"
                hint="Mute routine alerts overnight"
                onChange={(quietHours) => patch({ quietHours })}
              />
              <Switch
                checked={n.panicOverride}
                label="Panic overrides quiet hours"
                hint="Always surface life-safety alerts"
                onChange={(panicOverride) => patch({ panicOverride })}
              />
            </div>
            <div className={`settings-quiet-window ${n.quietHours ? '' : 'is-disabled'}`}>
              <div className="settings-quiet-window__label">
                <strong>Quiet window</strong>
                <small>{n.quietHours ? 'Routine alerts stay muted in this range' : 'Turn on quiet hours to edit the window'}</small>
              </div>
              <div className="settings-time-row settings-time-row--compact">
                <label className="settings-time-field">
                  <span>From</span>
                  <input
                    type="time"
                    value={n.quietFrom}
                    disabled={!n.quietHours}
                    onChange={(e) => patch({ quietFrom: e.target.value })}
                  />
                </label>
                <span className="settings-time-sep" aria-hidden>
                  →
                </span>
                <label className="settings-time-field">
                  <span>To</span>
                  <input
                    type="time"
                    value={n.quietTo}
                    disabled={!n.quietHours}
                    onChange={(e) => patch({ quietTo: e.target.value })}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <SaveBar
          saved={saved === 'Notifications'}
          onSave={() =>
            commit(
              settings,
              'Notifications',
              'Notification channels updated',
              `Bell ${n.bell ? 'on' : 'off'} · SMS ${n.sms ? 'on' : 'off'} · quiet hours ${n.quietHours ? 'on' : 'off'}`,
            )
          }
        />
      </section>
    );
  }

  if (section === 'organisation') {
    const o = settings.organisation;
    return (
      <section className="portal-card settings-panel">
        <div className="settings-panel__head">
          <div>
            <p className="settings-panel__eyebrow">Organisation</p>
            <h2>Company profile</h2>
            <p className="text-muted">Shown on invoices, panic SMS footer and the client portal.</p>
          </div>
        </div>
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            commit(settings, 'Organisation', 'Organisation profile saved', `${o.name} · ${o.slug}`);
          }}
        >
          <div className="form-row-2">
            <label>
              Legal name
              <input value={o.name} onChange={(e) => setSettings({ ...settings, organisation: { ...o, name: e.target.value } })} />
            </label>
            <label>
              Trading name
              <input value={o.tradingName} onChange={(e) => setSettings({ ...settings, organisation: { ...o, tradingName: e.target.value } })} />
            </label>
          </div>
          <div className="form-row-2">
            <label>
              Org slug
              <input value={o.slug} readOnly />
            </label>
            <label>
              Company registration
              <input value={o.registration} onChange={(e) => setSettings({ ...settings, organisation: { ...o, registration: e.target.value } })} />
            </label>
          </div>
          <div className="form-row-2">
            <label>
              VAT number
              <input value={o.vat} onChange={(e) => setSettings({ ...settings, organisation: { ...o, vat: e.target.value } })} />
            </label>
            <label>
              Support phone
              <input value={o.supportPhone} onChange={(e) => setSettings({ ...settings, organisation: { ...o, supportPhone: e.target.value } })} />
            </label>
          </div>
          <label>
            After-hours number
            <input value={o.afterHoursPhone} onChange={(e) => setSettings({ ...settings, organisation: { ...o, afterHoursPhone: e.target.value } })} />
          </label>
          <label>
            Physical address
            <input value={o.address} onChange={(e) => setSettings({ ...settings, organisation: { ...o, address: e.target.value } })} />
          </label>
          <SaveBar saved={saved === 'Organisation'} onSave={() => commit(settings, 'Organisation', 'Organisation profile saved', `${o.name} · ${o.slug}`)} />
        </form>
      </section>
    );
  }

  if (section === 'branches') {
    return <BranchesPanel actor={actor} onLogged={(next) => { setSettings(next); saveCrSettings(next); }} settings={settings} />;
  }

  if (section === 'security') {
    const s = settings.security;
    return (
      <section className="portal-card settings-panel">
        <div className="settings-panel__head">
          <div>
            <p className="settings-panel__eyebrow">Security</p>
            <h2>Access &amp; sessions</h2>
            <p className="text-muted">Desk lockout, MFA and trusted-device heartbeat for this organisation.</p>
          </div>
          <Link href="/control-room/device-security" className="link-sm">
            Device security →
          </Link>
        </div>
        <div className="settings-inline-grid">
          <label className="settings-inline-field">
            Idle session timeout
            <UiSelect
              compact={false}
              ariaLabel="Session timeout"
              value={s.sessionMinutes}
              onChange={(sessionMinutes) => setSettings({ ...settings, security: { ...s, sessionMinutes } })}
              options={[
                { value: '15', label: '15 minutes' },
                { value: '30', label: '30 minutes' },
                { value: '60', label: '60 minutes' },
              ]}
            />
          </label>
          <label className="settings-inline-field">
            Failed login lockout
            <UiSelect
              compact={false}
              ariaLabel="Lockout attempts"
              value={s.lockoutAttempts}
              onChange={(lockoutAttempts) => setSettings({ ...settings, security: { ...s, lockoutAttempts } })}
              options={[
                { value: '3', label: '3 attempts' },
                { value: '5', label: '5 attempts' },
                { value: '10', label: '10 attempts' },
              ]}
            />
          </label>
          <label className="settings-inline-field">
            Password rotation
            <UiSelect
              compact={false}
              ariaLabel="Password rotation"
              value={s.passwordDays}
              onChange={(passwordDays) => setSettings({ ...settings, security: { ...s, passwordDays } })}
              options={[
                { value: '30', label: 'Every 30 days' },
                { value: '90', label: 'Every 90 days' },
                { value: '180', label: 'Every 180 days' },
              ]}
            />
          </label>
        </div>
        <div className="settings-switch-list">
          <Switch checked={s.mfaOwners} label="Require MFA for owners" hint="Email or authenticator at login" onChange={(mfaOwners) => setSettings({ ...settings, security: { ...s, mfaOwners } })} />
          <Switch checked={s.mfaDispatchers} label="Require MFA for dispatchers" hint="Recommended for shared desks" onChange={(mfaDispatchers) => setSettings({ ...settings, security: { ...s, mfaDispatchers } })} />
          <Switch checked={s.deviceHeartbeat} label="Trusted device heartbeat" hint="Portal devices must check in to stay trusted" onChange={(deviceHeartbeat) => setSettings({ ...settings, security: { ...s, deviceHeartbeat } })} />
        </div>
        <SaveBar
          saved={saved === 'Security'}
          onSave={() =>
            commit(
              settings,
              'Security',
              'Security policy updated',
              `Timeout ${s.sessionMinutes}m · lockout ${s.lockoutAttempts} · MFA owners ${s.mfaOwners ? 'on' : 'off'}`,
            )
          }
        />
      </section>
    );
  }

  if (section === 'billing') {
    const b = settings.billing;
    return (
      <>
        <section className="portal-card settings-panel">
          <div className="settings-panel__head">
            <div>
              <p className="settings-panel__eyebrow">Billing</p>
              <h2>Plan &amp; invoicing</h2>
              <p className="text-muted">Organisation subscription, VAT treatment and dunning for past-due accounts.</p>
            </div>
            <Link href="/control-room/customers" className="link-sm">
              Customer billing →
            </Link>
          </div>
          <dl className="settings-kv">
            <div>
              <dt>Plan</dt>
              <dd>{b.plan}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status="Operational" />
              </dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd>Control room + officer + technician apps</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>ZAR</dd>
            </div>
          </dl>
          <div className="settings-inline-grid">
            <label className="settings-inline-field">
              Invoice email
              <input
                type="email"
                value={b.invoiceEmail}
                onChange={(e) => setSettings({ ...settings, billing: { ...b, invoiceEmail: e.target.value } })}
              />
            </label>
          </div>
          <div className="settings-switch-list">
            <Switch checked={b.vatInclusive} label="Prices include VAT" hint="15% shown on client quotes" onChange={(vatInclusive) => setSettings({ ...settings, billing: { ...b, vatInclusive } })} />
            <Switch checked={b.autoRetry} label="Auto-retry failed collections" hint="Retry unpaid subscriptions for 7 days" onChange={(autoRetry) => setSettings({ ...settings, billing: { ...b, autoRetry } })} />
          </div>
          <SaveBar
            saved={saved === 'Billing'}
            onSave={() => commit(settings, 'Billing', 'Billing settings saved', `Invoices to ${b.invoiceEmail}`)}
          />
        </section>
        {canGrantRevenue ? (
          <section className="portal-card settings-panel">
            <div className="settings-panel__head">
              <div>
                <p className="settings-panel__eyebrow">Revenue scope</p>
                <h2>Developer revenue access</h2>
                <p className="text-muted">
                  By default the developer sees ops and inventory but not money generated. Unlock only after commercial approval.
                </p>
              </div>
            </div>
            {revenueErr ? <ErrorAlert error={revenueErr} /> : null}
            {revenueMsg ? <div className="alert alert--success">{revenueMsg}</div> : null}
            <div className="entity-card-actions" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="btn-primary btn-sm" disabled={revenueBusy} onClick={() => onRevenue(true)}>
                Allow developer to see revenue
              </button>
              <button type="button" className="btn-secondary btn-sm" disabled={revenueBusy} onClick={() => onRevenue(false)}>
                Hide revenue again
              </button>
            </div>
          </section>
        ) : null}
      </>
    );
  }

  if (section === 'integrations') {
    const i = settings.integrations;
    return (
      <>
        <section className="portal-card settings-panel">
          <div className="settings-panel__head">
            <div>
              <p className="settings-panel__eyebrow">Integrations</p>
              <h2>API access</h2>
              <p className="text-muted">Server-to-server key for webhooks and partner systems. Rotate if it leaks.</p>
            </div>
          </div>
          <label className="settings-inline-field">
            Live API key
            <div className="settings-key-row">
              <input readOnly value={i.apiKey} onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  const apiKey = `nx_live_4ds_${Math.random().toString(36).slice(2, 10)}`;
                  commit({ ...settings, integrations: { ...i, apiKey } }, 'Integrations', 'API key rotated', 'Previous live key revoked');
                }}
              >
                Rotate
              </button>
            </div>
          </label>
        </section>
        <section className="portal-card settings-panel">
          <div className="settings-panel__head">
            <div>
              <p className="settings-panel__eyebrow">Webhooks</p>
              <h2>Outbound events</h2>
            </div>
          </div>
          <ul className="settings-connector-list">
            {i.webhooks.map((hook) => (
              <li key={hook.id}>
                <div>
                  <strong>{hook.name}</strong>
                  <span className="text-muted">{hook.url}</span>
                </div>
                <Switch
                  checked={hook.enabled}
                  label={hook.enabled ? 'Enabled' : 'Disabled'}
                  onChange={(enabled) => {
                    const webhooks = i.webhooks.map((item) => (item.id === hook.id ? { ...item, enabled } : item));
                    commit({ ...settings, integrations: { ...i, webhooks } }, 'Integrations', `${hook.name} ${enabled ? 'enabled' : 'paused'}`, hook.url);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
        <section className="portal-card settings-panel">
          <div className="settings-panel__head">
            <div>
              <p className="settings-panel__eyebrow">Connectors</p>
              <h2>Ops services</h2>
            </div>
          </div>
          <ul className="settings-connector-list">
            {i.connectors.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span className="text-muted">{item.detail}</span>
                </div>
                <StatusBadge status={item.status} tone={item.status === 'Connected' ? 'success' : 'warning'} />
              </li>
            ))}
          </ul>
        </section>
      </>
    );
  }

  if (section === 'audit') {
    return <AuditPanel entries={settings.audit} />;
  }

  return null;
}

function BranchesPanel({
  actor,
  settings,
  onLogged,
}: {
  actor: string;
  settings: CrSettings;
  onLogged: (next: CrSettings) => void;
}) {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<Branch[]>>('/control-room/branches'),
    [],
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const branches = data?.data ?? [];

  async function createBranch(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await adminApi.post('/control-room/branches', { name: name.trim(), code: code.trim() });
      onLogged(withAudit(settings, 'Branches', 'Branch created', `${name.trim()} (${code.trim().toUpperCase()})`, actor));
      setName('');
      setCode('');
      setOpen(false);
      void reload();
    } catch (err) {
      setFormError(friendlyErrorMessage(err, 'save'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(branch: Branch) {
    try {
      await adminApi.patch(`/control-room/branches/${branch.id}`, { isActive: !branch.isActive });
      onLogged(
        withAudit(
          settings,
          'Branches',
          branch.isActive ? 'Branch deactivated' : 'Branch reactivated',
          `${branch.name} (${branch.code})`,
          actor,
        ),
      );
      void reload();
    } catch (err) {
      setFormError(friendlyErrorMessage(err, 'save'));
    }
  }

  return (
    <section className="portal-card settings-panel">
      <div className="settings-panel__head">
        <div>
          <p className="settings-panel__eyebrow">Branches</p>
          <h2>Sites &amp; coverage</h2>
          <p className="text-muted">Branches group officers, vehicles and teams by location.</p>
        </div>
        <div className="settings-panel__actions">
          <Link href="/control-room/teams" className="link-sm">
            Teams &amp; users →
          </Link>
          <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(true)}>
            Add branch
          </button>
        </div>
      </div>
      {formError ? <ErrorAlert error={formError} /> : null}
      {loading ? <LoadingSpinner label="Loading branches..." /> : null}
      {error ? <ErrorAlert error={error} onRetry={() => void reload()} /> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Code</th>
              <th>Users</th>
              <th>Officers</th>
              <th>Teams</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td>{branch.name}</td>
                <td>{branch.code}</td>
                <td>{branch._count?.users ?? 0}</td>
                <td>{branch._count?.officers ?? 0}</td>
                <td>{branch.teams?.length ?? 0}</td>
                <td>
                  <StatusBadge status={branch.isActive ? 'Operational' : 'Suspended'} />
                </td>
                <td>
                  <button type="button" className="link-sm" onClick={() => void toggleActive(branch)}>
                    {branch.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? (
        <OpsDialog title="Add branch" subtitle="Use a short code operators will recognise on the map." onClose={() => setOpen(false)}>
          <form className="stack-form" onSubmit={createBranch}>
            {formError ? <ErrorAlert error={formError} /> : null}
            <label>
              Branch name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Westville" required />
            </label>
            <label>
              Code
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WVL" maxLength={6} required />
            </label>
            <div className="fleet-form__actions">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-ok" disabled={saving}>
                {saving ? 'Saving…' : 'Add branch'}
              </button>
            </div>
          </form>
        </OpsDialog>
      ) : null}
    </section>
  );
}

function AuditPanel({ entries }: { entries: CrSettings['audit'] }) {
  const [module, setModule] = useState('all');
  const modules = useMemo(() => ['all', ...Array.from(new Set(entries.map((item) => item.module)))], [entries]);
  const rows = entries.filter((item) => module === 'all' || item.module === module);
  const company = getCompanyProfile();

  function exportAuditCsv() {
    exportCsv(
      '4ds-settings-audit.csv',
      rows.map((row) => ({
        Time: row.time,
        Tool: row.module,
        Title: row.title,
        Detail: row.detail,
        Actor: row.actor,
      })),
      {
        title: 'Configuration audit log',
        companyName: company.legalName,
      },
    );
  }

  function exportAuditReport() {
    const stamp = new Date().toISOString();
    openBrandedDocument(
      {
        kind: 'AUDIT',
        title: 'Configuration audit log',
        reference: `AUD-${stamp.slice(0, 10).replace(/-/g, '')}`,
        issuedAt: stamp,
        status: module === 'all' ? 'All tools' : module,
        billTo: {
          name: company.legalName,
          email: company.invoiceEmail || undefined,
          phone: company.supportPhone || undefined,
          address: company.address || undefined,
        },
        total: `${rows.length} entries`,
        table: {
          headers: ['Time', 'Tool', 'Title', 'Detail', 'Actor'],
          rows: rows.map((row) => [row.time, row.module, row.title, row.detail, row.actor]),
        },
        notes: [
          'Official settings change register for this control-room workstation.',
          'Use Print / Save as PDF for a signed archive copy with company letterhead.',
        ],
      },
      { autoPrint: true },
    );
  }

  return (
    <section className="portal-card settings-panel">
      <div className="settings-panel__head">
        <div>
          <p className="settings-panel__eyebrow">Audit Logs</p>
          <h2>Configuration history</h2>
          <p className="text-muted">Changes made in Settings stay on this desk for the current demo session.</p>
        </div>
        <div className="settings-panel__actions">
          <UiSelect
            compact
            ariaLabel="Filter tool"
            value={module}
            onChange={setModule}
            options={modules.map((value) => ({ value, label: value === 'all' ? 'All tools' : value }))}
          />
          <button type="button" className="btn-primary btn-sm" onClick={exportAuditReport}>
            Print report
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={exportAuditCsv}>
            Export CSV
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Tool</th>
              <th>Change</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.time}</td>
                <td>{row.module}</td>
                <td>
                  <strong>{row.title}</strong>
                  <div className="text-muted">{row.detail}</div>
                </td>
                <td>{row.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
