'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { formatDateTime, type DeviceTestResult, type DiscoveredDevice } from '@/lib/vms/types';

export type DeviceSite = { id: string; name: string; address?: string };

export type EditableDevice = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  recorderType: string;
  recorderIp: string | null;
  recorderSerial: string | null;
  cloudId: string | null;
  status: string;
  techNotes: string | null;
};

export function VmsModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="vms-modal-scrim" onClick={onClose} aria-hidden />
      <div className="vms-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="vms-modal__head">
          <h2>{title}</h2>
          <button type="button" className="vms-icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="vms-modal__body">{children}</div>
        {footer ? <footer className="vms-modal__foot">{footer}</footer> : null}
      </div>
    </>
  );
}

function SiteSelect({ sites, value, onChange }: { sites: DeviceSite[]; value: string; onChange: (v: string) => void }) {
  return (
    <label className="vms-field">
      <span>Assign to site</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Unassigned</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** "Online devices" — LAN / ONVIF discovery with add-selected. */
export function DiscoveryPanel({ sites, onAdded }: { sites: DeviceSite[]; onAdded: () => void }) {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<DiscoveredDevice[] | { devices: DiscoveredDevice[]; integrationPending: boolean }>>('/control-room/vms/discovery'),
    [],
  );
  const raw = data?.data;
  const devices = Array.isArray(raw) ? raw : raw?.devices ?? [];
  const pending = !Array.isArray(raw) && Boolean(raw?.integrationPending);
  const [selected, setSelected] = useState<string[]>([]);
  const [siteId, setSiteId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const addable = devices.filter((d) => !d.added);

  async function add() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminApi.post<ApiResponse<unknown[]>>('/control-room/vms/discovery/add', {
        deviceIds: selected,
        propertyId: siteId || undefined,
      });
      setMsg({ tone: 'ok', text: `${res.data.length} device${res.data.length === 1 ? '' : 's'} added to managed devices.` });
      setSelected([]);
      await reload({ silent: true });
      onAdded();
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Could not add devices' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vms-card">
      <div className="vms-toolbar" style={{ padding: 0, border: 0, background: 'transparent' }}>
        <strong>Online devices</strong>
        <span className="vms-muted">
          {devices.length} found on the network · {addable.length} not yet added
        </span>
        {!pending ? <span className="vms-badge">Demo</span> : null}
        <span className="vms-toolbar__spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()} disabled={loading}>
          {loading ? 'Searching…' : 'Refresh'}
        </button>
      </div>
      {pending ? (
        <p className="vms-banner">Network discovery needs an on-site gateway. Use “Add manually” with the recorder IP instead.</p>
      ) : null}
      {error ? <p className="vms-error">{error}</p> : null}
      <div className="vms-table-wrap">
        <table className="vms-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Select all new devices"
                  checked={addable.length > 0 && selected.length === addable.length}
                  onChange={(e) => setSelected(e.target.checked ? addable.map((d) => d.id) : [])}
                />
              </th>
              <th>IP address</th>
              <th>Port</th>
              <th>Type</th>
              <th>Vendor / model</th>
              <th>Channels</th>
              <th>Serial</th>
              <th>Firmware</th>
              <th>MAC</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 && !loading ? (
              <tr>
                <td colSpan={10} className="vms-muted vms-table__empty">
                  No devices answered the search.
                </td>
              </tr>
            ) : null}
            {devices.map((d) => (
              <tr key={d.id} className={selected.includes(d.id) ? 'is-selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    disabled={d.added}
                    aria-label={`Select ${d.ip}`}
                    checked={selected.includes(d.id)}
                    onChange={(e) =>
                      setSelected((prev) => (e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)))
                    }
                  />
                </td>
                <td className="vms-mono">{d.ip}</td>
                <td>{d.port}</td>
                <td>{d.kind}</td>
                <td>
                  {d.vendor} <span className="vms-sub">{d.model}</span>
                </td>
                <td>{d.channels}</td>
                <td className="vms-mono">{d.serial}</td>
                <td>{d.firmware}</td>
                <td className="vms-mono">{d.macAddress}</td>
                <td>
                  <span className={`vms-status ${d.added ? 'vms-status--done' : ''}`}>{d.added ? 'Added' : 'New'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="vms-inline-form" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <SiteSelect sites={sites} value={siteId} onChange={setSiteId} />
        </div>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || selected.length === 0} onClick={() => void add()}>
          {busy ? 'Adding…' : `Add selected (${selected.length})`}
        </button>
      </div>
      {msg ? <p className={msg.tone === 'err' ? 'vms-error' : 'vms-ok'}>{msg.text}</p> : null}
    </div>
  );
}

/** Manual add by IP / domain (ONVIF or vendor protocol). */
export function ManualAddModal({ sites, onClose, onAdded }: { sites: DeviceSite[]; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    name: '',
    ip: '',
    port: '80',
    protocol: 'ONVIF',
    brand: '',
    model: '',
    recorderType: 'NVR',
    channels: '4',
    username: 'admin',
    password: '',
    propertyId: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.post('/control-room/vms/devices', {
        name: form.name,
        ip: form.ip,
        port: Number(form.port) || undefined,
        brand: form.brand || (form.protocol === 'ONVIF' ? 'Generic ONVIF' : form.protocol),
        model: form.model || undefined,
        recorderType: form.recorderType,
        channels: Number(form.channels) || 1,
        propertyId: form.propertyId || undefined,
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add device');
    } finally {
      setBusy(false);
    }
  }

  return (
    <VmsModal
      title="Add device manually"
      onClose={onClose}
      footer={
        <>
          <span className="vms-muted">Credentials are only used for the connection test in demo mode.</span>
          <span className="vms-toolbar__spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="vms-manual-add" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? 'Adding…' : 'Add device'}
          </button>
        </>
      }
    >
      <form id="vms-manual-add" className="vms-form-grid" onSubmit={(e) => void submit(e)}>
        {error ? <p className="vms-error" style={{ gridColumn: '1 / -1' }}>{error}</p> : null}
        <label className="vms-field">
          <span>Device name *</span>
          <input required value={form.name} onChange={set('name')} placeholder="Front gate NVR" />
        </label>
        <label className="vms-field">
          <span>IP / domain *</span>
          <input required value={form.ip} onChange={set('ip')} placeholder="192.168.1.64" />
        </label>
        <label className="vms-field">
          <span>Port</span>
          <input type="number" min={1} max={65535} value={form.port} onChange={set('port')} />
        </label>
        <label className="vms-field">
          <span>Protocol</span>
          <select value={form.protocol} onChange={set('protocol')}>
            <option value="ONVIF">ONVIF</option>
            <option value="Hikvision">Hikvision SDK</option>
            <option value="Dahua">Dahua SDK</option>
            <option value="RTSP">RTSP</option>
          </select>
        </label>
        <label className="vms-field">
          <span>Type</span>
          <select value={form.recorderType} onChange={set('recorderType')}>
            <option value="NVR">NVR</option>
            <option value="DVR">DVR</option>
            <option value="IPC">IP camera</option>
          </select>
        </label>
        <label className="vms-field">
          <span>Channels</span>
          <input type="number" min={1} max={64} value={form.channels} onChange={set('channels')} />
        </label>
        <label className="vms-field">
          <span>Brand</span>
          <input value={form.brand} onChange={set('brand')} placeholder="Hikvision" />
        </label>
        <label className="vms-field">
          <span>Model</span>
          <input value={form.model} onChange={set('model')} placeholder="DS-7608NI" />
        </label>
        <label className="vms-field">
          <span>Username</span>
          <input value={form.username} onChange={set('username')} autoComplete="off" />
        </label>
        <label className="vms-field">
          <span>Password</span>
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </label>
        <SiteSelect sites={sites} value={form.propertyId} onChange={(v) => setForm((f) => ({ ...f, propertyId: v }))} />
      </form>
    </VmsModal>
  );
}

const STATUS_OPTIONS = ['COMMISSIONING', 'ONLINE', 'OFFLINE', 'FAULT'];

export function DeviceEditModal({ device, onClose, onSaved }: { device: EditableDevice; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: device.name,
    brand: device.brand ?? '',
    model: device.model ?? '',
    recorderIp: device.recorderIp ?? '',
    recorderSerial: device.recorderSerial ?? '',
    cloudId: device.cloudId ?? '',
    status: device.status,
    techNotes: device.techNotes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApi.patch(`/control-room/cctv-systems/${device.id}`, {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        recorderIp: form.recorderIp.trim() || null,
        recorderSerial: form.recorderSerial.trim() || null,
        cloudId: form.cloudId.trim() || null,
        status: form.status,
        techNotes: form.techNotes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <VmsModal
      title={`Edit ${device.name}`}
      onClose={onClose}
      footer={
        <>
          <span className="vms-toolbar__spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="vms-device-edit" className="btn btn-primary btn-sm" disabled={busy || !form.name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="vms-device-edit" className="vms-form-grid" onSubmit={(e) => void submit(e)}>
        {error ? <p className="vms-error" style={{ gridColumn: '1 / -1' }}>{error}</p> : null}
        <label className="vms-field">
          <span>Name *</span>
          <input required value={form.name} onChange={set('name')} />
        </label>
        <label className="vms-field">
          <span>Brand</span>
          <input value={form.brand} onChange={set('brand')} />
        </label>
        <label className="vms-field">
          <span>Model</span>
          <input value={form.model} onChange={set('model')} />
        </label>
        <label className="vms-field">
          <span>IP / domain</span>
          <input value={form.recorderIp} onChange={set('recorderIp')} />
        </label>
        <label className="vms-field">
          <span>Serial</span>
          <input value={form.recorderSerial} onChange={set('recorderSerial')} />
        </label>
        <label className="vms-field">
          <span>Cloud / P2P ID</span>
          <input value={form.cloudId} onChange={set('cloudId')} />
        </label>
        <label className="vms-field">
          <span>Status</span>
          <select value={form.status} onChange={set('status')}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="vms-field" style={{ gridColumn: '1 / -1' }}>
          <span>Tech notes</span>
          <textarea rows={3} value={form.techNotes} onChange={set('techNotes')} />
        </label>
      </form>
    </VmsModal>
  );
}

/** Test connection + time sync buttons with inline result. */
export function DeviceHealthActions({ deviceId }: { deviceId: string }) {
  const [busy, setBusy] = useState<'test' | 'sync' | null>(null);
  const [result, setResult] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  async function test() {
    setBusy('test');
    setResult(null);
    try {
      const res = await adminApi.post<ApiResponse<DeviceTestResult>>(`/control-room/vms/devices/${deviceId}/test`);
      const r = res.data;
      setResult({
        tone: r.ok ? 'ok' : 'err',
        text: r.ok
          ? `Online · ${r.latencyMs ?? '?'} ms · ${r.channelsOnline}/${r.channelsTotal} channels`
          : r.message,
      });
    } catch (err) {
      setResult({ tone: 'err', text: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy('sync');
    setResult(null);
    try {
      const res = await adminApi.post<ApiResponse<{ syncedAt: string }>>(`/control-room/vms/devices/${deviceId}/time-sync`);
      setResult({ tone: 'ok', text: `Clock synced ${formatDateTime(res.data.syncedAt)}` });
    } catch (err) {
      setResult({ tone: 'err', text: err instanceof Error ? err.message : 'Time sync failed' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="vms-device-health">
      <div className="vms-actions">
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={() => void test()}>
          {busy === 'test' ? 'Testing…' : 'Test connection'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={() => void sync()}>
          {busy === 'sync' ? 'Syncing…' : 'Time sync'}
        </button>
      </div>
      {result ? (
        <p className={result.tone === 'err' ? 'vms-error' : 'vms-ok'} role="status">
          {result.text}
        </p>
      ) : null}
    </div>
  );
}
