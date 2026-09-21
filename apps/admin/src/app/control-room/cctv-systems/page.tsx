'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { CameraPlaceSelect, CameraZoneSelect } from '@/components/ui/CameraPlaceSelect';
import { UiSelect } from '@/components/ui/UiSelect';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { matchesSearch } from '@/lib/list-search';

type SiteType = { value: string; label: string };

type KitPreset = {
  id: string;
  label: string;
  brand: string;
  model: string;
  kitSku: string;
  supplier: string;
  recorderType: string;
  channelCount: number;
  connectivity: string;
  resolution: string;
  hddInstalled: boolean;
  mobileAppEnabled: boolean;
  cameraLabels: string[];
};

type CameraRow = {
  id?: string;
  name: string;
  locationLabel: string;
  channel: number;
  serialNumber: string;
  model: string;
  resolution: string;
  placement: 'EXTERIOR' | 'INTERIOR';
  vendor: string;
};

type CctvSystemRow = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  kitSku: string | null;
  supplier: string | null;
  recorderType: string;
  channelCount: number;
  connectivity: string;
  recorderSerial: string | null;
  recorderIp: string | null;
  cloudId: string | null;
  hddInstalled: boolean;
  hddSerial: string | null;
  hddCapacityGb: number | null;
  status: string;
  techNotes: string | null;
  property: {
    id: string;
    name: string;
    address: string;
    propertyType: string;
    client: { id: string; name: string; email: string } | null;
  } | null;
  cameras: Array<{
    id: string;
    name: string;
    locationLabel: string;
    channel: number;
    serialNumber: string | null;
    model: string | null;
    resolution: string | null;
    placement: string;
    status: string;
  }>;
};

type ListPayload = {
  presets: KitPreset[];
  siteTypes: SiteType[];
  systems: CctvSystemRow[];
};

type ClientRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
};

type PropertyOption = {
  id: string;
  name: string;
  address: string;
  propertyType?: string;
  client?: { id: string; name: string };
};

const RECORDER_TYPES = [
  { value: 'DVR', label: 'DVR' },
  { value: 'NVR', label: 'NVR' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'IP_KIT', label: 'IP kit' },
];

const CONNECTIVITY = [
  { value: 'AHD', label: 'AHD' },
  { value: 'ANALOG', label: 'Analog' },
  { value: 'LAN', label: 'LAN / PoE' },
  { value: 'WIFI', label: 'Wi‑Fi' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'CLOUD', label: 'Cloud / P2P' },
];

const STATUS_OPTIONS = [
  { value: 'COMMISSIONING', label: 'Commissioning' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'FAULT', label: 'Fault' },
];

function blankCameras(count: number, labels: string[] = [], brand = ''): CameraRow[] {
  return Array.from({ length: count }, (_, i) => ({
    name: labels[i] ? labels[i] : `Camera ${i + 1}`,
    locationLabel: labels[i] || '',
    channel: i + 1,
    serialNumber: '',
    model: '',
    resolution: '',
    placement: 'EXTERIOR' as const,
    vendor: brand,
  }));
}

function clientLabel(c: ClientRow) {
  return c.name || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email;
}

export default function CctvSystemsPage() {
  return (
    <ControlRoomLayout title="CCTV systems">
      <CctvSystemsContent />
    </ControlRoomLayout>
  );
}

function CctvSystemsContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<ListPayload>>('/control-room/cctv-systems'),
    [],
  );
  const { data: clientsData } = useApi(
    () => adminApi.get<ApiResponse<ClientRow[]>>('/control-room/clients'),
    [],
  );
  const { data: surveillanceData } = useApi(
    () =>
      adminApi.get<
        ApiResponse<{ sites: PropertyOption[] }>
      >('/control-room/surveillance'),
    [],
  );

  const presets = data?.data?.presets ?? [];
  const siteTypes = data?.data?.siteTypes ?? [];
  const systems = data?.data?.systems ?? [];
  const clients = clientsData?.data ?? [];
  const sites = surveillanceData?.data?.sites ?? [];

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [formMsg, setFormMsg] = useState('');

  const [mode, setMode] = useState<'new-site' | 'existing'>('new-site');
  const [clientUserId, setClientUserId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [propertyType, setPropertyType] = useState('HOUSE');
  const [accessNotes, setAccessNotes] = useState('');
  const [gateCode, setGateCode] = useState('');

  const [presetId, setPresetId] = useState('');
  const [systemName, setSystemName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [kitSku, setKitSku] = useState('');
  const [recorderType, setRecorderType] = useState('DVR');
  const [channelCount, setChannelCount] = useState(4);
  const [connectivity, setConnectivity] = useState('AHD');
  const [recorderSerial, setRecorderSerial] = useState('');
  const [recorderIp, setRecorderIp] = useState('');
  const [cloudId, setCloudId] = useState('');
  const [hddInstalled, setHddInstalled] = useState(false);
  const [hddSerial, setHddSerial] = useState('');
  const [hddCapacityGb, setHddCapacityGb] = useState('');
  const [firmware, setFirmware] = useState('');
  const [mobileAppEnabled, setMobileAppEnabled] = useState(true);
  const [status, setStatus] = useState('COMMISSIONING');
  const [techNotes, setTechNotes] = useState('');
  const [cameras, setCameras] = useState<CameraRow[]>(() => blankCameras(4));

  const filtered = useMemo(
    () =>
      systems.filter((s) =>
        matchesSearch(
          search,
          s.name,
          s.brand,
          s.model,
          s.recorderSerial,
          s.cloudId,
          s.property?.name,
          s.property?.address,
          s.property?.propertyType,
          s.property?.client?.name,
          ...(s.cameras ?? []).map((c) => c.serialNumber),
        ),
      ),
    [systems, search],
  );

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setSystemName(preset.label);
    setBrand(preset.brand);
    setModel(preset.model);
    setKitSku(preset.kitSku);
    setRecorderType(preset.recorderType);
    setChannelCount(preset.channelCount);
    setConnectivity(preset.connectivity);
    setHddInstalled(preset.hddInstalled);
    setMobileAppEnabled(preset.mobileAppEnabled);
    setCameras(
      blankCameras(preset.channelCount, preset.cameraLabels, preset.brand).map((c) => ({
        ...c,
        resolution: preset.resolution,
        model: preset.model,
      })),
    );
  }

  function syncChannelCount(next: number) {
    const n = Math.min(64, Math.max(1, next || 1));
    setChannelCount(n);
    setCameras((prev) => {
      if (prev.length === n) return prev;
      if (prev.length > n) return prev.slice(0, n);
      return [
        ...prev,
        ...blankCameras(n - prev.length, [], brand).map((c, i) => ({
          ...c,
          channel: prev.length + i + 1,
          name: `Camera ${prev.length + i + 1}`,
          locationLabel: '',
          resolution: prev[0]?.resolution || '',
          model: prev[0]?.model || model,
        })),
      ];
    });
  }

  function addCameraChannel() {
    if (cameras.length >= 64) return;
    syncChannelCount(cameras.length + 1);
  }

  function removeCameraChannel(index: number) {
    if (cameras.length <= 1) return;
    setCameras((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((c, i) => ({
          ...c,
          channel: i + 1,
          name: c.name.trim() && !/^Camera \d+$/i.test(c.name) ? c.name : `Camera ${i + 1}`,
        })),
    );
    setChannelCount((n) => Math.max(1, n - 1));
  }

  function updateCamera(index: number, patch: Partial<CameraRow>) {
    setCameras((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function resetForm() {
    setFormError('');
    setFormMsg('');
    setMode('new-site');
    setClientUserId('');
    setPropertyId('');
    setSiteName('');
    setSiteAddress('');
    setPropertyType('HOUSE');
    setAccessNotes('');
    setGateCode('');
    setPresetId('');
    setSystemName('');
    setBrand('');
    setModel('');
    setKitSku('');
    setRecorderType('DVR');
    setChannelCount(4);
    setConnectivity('AHD');
    setRecorderSerial('');
    setRecorderIp('');
    setCloudId('');
    setHddInstalled(false);
    setHddSerial('');
    setHddCapacityGb('');
    setFirmware('');
    setMobileAppEnabled(true);
    setStatus('COMMISSIONING');
    setTechNotes('');
    setCameras(blankCameras(4));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    setFormMsg('');
    try {
      const payload = {
        propertyId: mode === 'existing' ? propertyId || undefined : undefined,
        clientUserId: mode === 'new-site' ? clientUserId || undefined : undefined,
        site:
          mode === 'new-site'
            ? {
                name: siteName,
                address: siteAddress,
                propertyType,
                accessNotes: accessNotes || undefined,
                gateCode: gateCode || undefined,
              }
            : undefined,
        system: {
          name: systemName,
          brand: brand || undefined,
          model: model || undefined,
          kitSku: kitSku || undefined,
          recorderType,
          channelCount,
          connectivity,
          recorderSerial: recorderSerial || undefined,
          recorderIp: recorderIp || undefined,
          cloudId: cloudId || undefined,
          hddInstalled,
          hddSerial: hddSerial || undefined,
          hddCapacityGb: hddCapacityGb ? Number(hddCapacityGb) : undefined,
          firmware: firmware || undefined,
          mobileAppEnabled,
          techNotes: techNotes || undefined,
          status,
        },
        cameras: cameras.map((c) => ({
          name: c.name,
          locationLabel: c.locationLabel.trim() || c.name || `Channel ${c.channel}`,
          channel: c.channel,
          serialNumber: c.serialNumber || undefined,
          model: c.model || undefined,
          resolution: c.resolution || undefined,
          placement: c.placement,
          vendor: c.vendor || brand || undefined,
        })),
      };
      const res = await adminApi.post<ApiResponse<CctvSystemRow>>(
        '/control-room/cctv-systems',
        payload,
      );
      if (!res.success) throw new Error('Could not register CCTV system');
      setFormMsg(`Registered ${res.data?.name ?? 'system'} successfully.`);
      setShowForm(false);
      resetForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return <LoadingSpinner label="Loading CCTV systems…" />;
  }

  return (
    <div className="ops-page cctv-systems-page">
      <header className="ops-page-header">
        <div>
          <h1 className="ops-page-header__title">CCTV systems</h1>
          <p className="ops-page-header__subtitle">
            Register HiLook, Dahua, AHD and other kits against a house, store, mall, branch or
            warehouse — including DVR/NVR and camera serials for the tech team.
          </p>
        </div>
        <div className="ops-page-header__actions">
          <Link href={CONTROL_ROOM_ROUTES.alarmSystems} className="btn btn-ghost btn-sm">
            Alarm panels
          </Link>
          <Link href={CONTROL_ROOM_ROUTES.surveillance} className="btn btn-ghost btn-sm">
            Live CCTV
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              resetForm();
              setShowForm((v) => !v);
            }}
          >
            {showForm ? 'Close form' : 'Register kit'}
          </button>
        </div>
      </header>

      {error ? <ErrorAlert message={error} onRetry={() => void reload()} /> : null}
      {formMsg ? <p className="text-muted" style={{ color: 'var(--success)' }}>{formMsg}</p> : null}

      {showForm ? (
        <form className="ops-panel cctv-reg-form" onSubmit={(e) => void onSubmit(e)}>
          <h2 className="ops-panel__title">Register CCTV kit</h2>
          {formError ? <ErrorAlert message={formError} /> : null}

          <h3 className="cctv-reg-form__section cctv-reg-form__section--first">Site</h3>
          <div className="cctv-reg-form__grid">
            <label className="form-field">
              <span>Site mode</span>
              <UiSelect
                value={mode}
                onChange={(v) => setMode(v as 'new-site' | 'existing')}
                options={[
                  { value: 'new-site', label: 'New site (house / store / mall…)' },
                  { value: 'existing', label: 'Existing monitored site' },
                ]}
              />
            </label>

            {mode === 'new-site' ? (
              <>
                <label className="form-field">
                  <span>Customer</span>
                  <UiSelect
                    value={clientUserId}
                    onChange={setClientUserId}
                    options={[
                      { value: '', label: 'Select customer…' },
                      ...clients.map((c) => ({
                        value: c.id,
                        label: `${clientLabel(c)} · ${c.email}`,
                      })),
                    ]}
                  />
                </label>
                <label className="form-field">
                  <span>Site type</span>
                  <UiSelect
                    value={propertyType}
                    onChange={setPropertyType}
                    options={
                      siteTypes.length
                        ? siteTypes.map((t) => ({ value: t.value, label: t.label }))
                        : [
                            { value: 'HOUSE', label: 'House' },
                            { value: 'STORE', label: 'Store' },
                            { value: 'MALL', label: 'Mall' },
                            { value: 'BRANCH', label: 'Branch' },
                            { value: 'OFFICE', label: 'Office' },
                            { value: 'WAREHOUSE', label: 'Warehouse' },
                            { value: 'BUSINESS', label: 'Business' },
                          ]
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Site name</span>
                  <input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Gateway Mall — Shop 214"
                    required
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Address</span>
                  <input
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    placeholder="Street, suburb, city"
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Gate / access code</span>
                  <input value={gateCode} onChange={(e) => setGateCode(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Access notes (tech)</span>
                  <input
                    value={accessNotes}
                    onChange={(e) => setAccessNotes(e.target.value)}
                    placeholder="Guard house, after-hours contact…"
                  />
                </label>
              </>
            ) : (
              <label className="form-field form-field--full">
                <span>Existing site</span>
                <UiSelect
                  value={propertyId}
                  onChange={setPropertyId}
                  options={[
                    { value: '', label: 'Select site…' },
                    ...sites.map((s) => ({
                      value: s.id,
                      label: `${s.name} — ${s.address}`,
                    })),
                  ]}
                />
              </label>
            )}
          </div>

          <h3 className="cctv-reg-form__section">Kit / recorder</h3>
          <div className="cctv-reg-form__grid">
            <label className="form-field form-field--full">
              <span>Kit preset (optional)</span>
              <UiSelect
                value={presetId}
                onChange={applyPreset}
                options={[
                  { value: '', label: 'Custom / blank…' },
                  ...presets.map((p) => ({ value: p.id, label: p.label })),
                ]}
              />
            </label>
            <label className="form-field form-field--full">
              <span>System name</span>
              <input
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="e.g. Dahua 2Mp Bullet 8Ch Full Kit"
                required
              />
            </label>
            <label className="form-field">
              <span>Brand</span>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="HiLook / Dahua / Pro View" />
            </label>
            <label className="form-field">
              <span>Model</span>
              <input value={model} onChange={(e) => setModel(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Kit SKU</span>
              <input value={kitSku} onChange={(e) => setKitSku(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Recorder type</span>
              <UiSelect value={recorderType} onChange={setRecorderType} options={RECORDER_TYPES} />
            </label>
            <label className="form-field">
              <span>Channels</span>
              <input
                type="number"
                min={1}
                max={64}
                value={channelCount}
                onChange={(e) => syncChannelCount(Number(e.target.value))}
              />
            </label>
            <label className="form-field">
              <span>Connectivity</span>
              <UiSelect value={connectivity} onChange={setConnectivity} options={CONNECTIVITY} />
            </label>
            <label className="form-field">
              <span>Status</span>
              <UiSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </label>
            <label className="form-field">
              <span>DVR / NVR serial</span>
              <input
                value={recorderSerial}
                onChange={(e) => setRecorderSerial(e.target.value)}
                placeholder="Required to connect the recorder"
              />
            </label>
            <label className="form-field">
              <span>Recorder IP</span>
              <input
                value={recorderIp}
                onChange={(e) => setRecorderIp(e.target.value)}
                placeholder="192.168.x.x"
              />
            </label>
            <label className="form-field">
              <span>Cloud / P2P / device ID</span>
              <input
                value={cloudId}
                onChange={(e) => setCloudId(e.target.value)}
                placeholder="Mobile app / cloud ID"
              />
            </label>
            <label className="form-field">
              <span>Firmware</span>
              <input value={firmware} onChange={(e) => setFirmware(e.target.value)} />
            </label>
            <label className="cctv-reg-form__check form-field--full">
              <input
                type="checkbox"
                checked={hddInstalled}
                onChange={(e) => setHddInstalled(e.target.checked)}
              />
              <span>HDD installed (many kits ship without a drive)</span>
            </label>
            <label className="form-field">
              <span>HDD serial</span>
              <input
                value={hddSerial}
                onChange={(e) => setHddSerial(e.target.value)}
                disabled={!hddInstalled}
              />
            </label>
            <label className="form-field">
              <span>HDD capacity (GB)</span>
              <input
                type="number"
                value={hddCapacityGb}
                onChange={(e) => setHddCapacityGb(e.target.value)}
                disabled={!hddInstalled}
                placeholder="1000"
              />
            </label>
            <label className="cctv-reg-form__check form-field--full">
              <input
                type="checkbox"
                checked={mobileAppEnabled}
                onChange={(e) => setMobileAppEnabled(e.target.checked)}
              />
              <span>Mobile app / remote viewing enabled</span>
            </label>
            <label className="form-field form-field--full">
              <span>Tech notes</span>
              <textarea
                value={techNotes}
                onChange={(e) => setTechNotes(e.target.value)}
                rows={3}
                placeholder="Power splitter location, cable runs, login credentials location, etc."
              />
            </label>
          </div>

          <h3 className="cctv-reg-form__section">Camera channels & serials</h3>
          <div className="cctv-cam-table-wrap">
            <table className="cctv-cam-table">
              <thead>
                <tr>
                  <th>Ch</th>
                  <th>Name</th>
                  <th>Place</th>
                  <th>Serial</th>
                  <th>Model</th>
                  <th>Res</th>
                  <th>Zone</th>
                  <th className="cctv-cam-table__actions-col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cameras.map((cam, idx) => (
                  <tr key={`cam-row-${idx}-${cam.channel}`}>
                    <td>{cam.channel}</td>
                    <td>
                      <input
                        value={cam.name}
                        onChange={(e) => updateCamera(idx, { name: e.target.value })}
                        required
                      />
                    </td>
                    <td className="cctv-cam-table__place">
                      <CameraPlaceSelect
                        value={cam.locationLabel}
                        ariaLabel={`Place for channel ${cam.channel}`}
                        onChange={({ locationLabel, placement }) =>
                          updateCamera(idx, {
                            locationLabel,
                            ...(placement ? { placement } : {}),
                            ...(locationLabel && !cam.name.trim()
                              ? { name: locationLabel }
                              : {}),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={cam.serialNumber}
                        onChange={(e) => updateCamera(idx, { serialNumber: e.target.value })}
                        placeholder="Camera SN"
                      />
                    </td>
                    <td>
                      <input
                        value={cam.model}
                        onChange={(e) => updateCamera(idx, { model: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={cam.resolution}
                        onChange={(e) => updateCamera(idx, { resolution: e.target.value })}
                        placeholder="2MP"
                      />
                    </td>
                    <td className="cctv-cam-table__zone">
                      <CameraZoneSelect
                        value={cam.placement}
                        ariaLabel={`Zone for channel ${cam.channel}`}
                        onChange={(placement) => updateCamera(idx, { placement })}
                      />
                    </td>
                    <td className="cctv-cam-table__row-actions">
                      <button
                        type="button"
                        className="cctv-cam-row-remove"
                        disabled={cameras.length <= 1}
                        onClick={() => removeCameraChannel(idx)}
                        aria-label={`Remove channel ${cam.channel}`}
                        title="Remove channel"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="cctv-cam-table-footer">
              <button
                type="button"
                className="cctv-cam-add"
                onClick={addCameraChannel}
                disabled={cameras.length >= 64}
              >
                <span className="cctv-cam-add__icon" aria-hidden>
                  +
                </span>
                Add channel / camera
              </button>
              <span className="text-muted cctv-cam-table-footer__count">
                {cameras.length} channel{cameras.length === 1 ? '' : 's'}
                {cameras.length >= 64 ? ' · max 64' : ''}
              </span>
            </div>
          </div>

          <div className="cctv-reg-form__actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save CCTV system'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="ops-toolbar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search brand, serial, site, mall…"
        />
      </div>

      {!filtered.length ? (
        <EmptyState
          title="No CCTV kits registered yet"
          body="Register a HiLook, Dahua or AHD kit against a house, store, mall or branch."
        />
      ) : (
        <div className="cctv-system-grid">
          {filtered.map((s) => (
            <article key={s.id} className="ops-panel cctv-system-card">
              <header className="cctv-system-card__head">
                <div>
                  <h3>{s.name}</h3>
                  <p className="text-muted">
                    {[s.brand, s.model].filter(Boolean).join(' · ') || 'Custom kit'}
                    {s.kitSku ? ` · ${s.kitSku}` : ''}
                  </p>
                </div>
                <span className={`ops-status ops-status--${statusTone(s.status)}`}>
                  {s.status}
                </span>
              </header>
              <dl className="cctv-system-card__facts">
                <div>
                  <dt>Site</dt>
                  <dd>
                    {s.property?.name ?? '—'}
                    <span className="text-muted">
                      {' '}
                      · {s.property?.propertyType ?? '—'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{s.property?.address ?? '—'}</dd>
                </div>
                <div>
                  <dt>Customer</dt>
                  <dd>{s.property?.client?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt>Recorder</dt>
                  <dd>
                    {s.recorderType} · {s.channelCount}ch · {s.connectivity}
                  </dd>
                </div>
                <div>
                  <dt>DVR/NVR serial</dt>
                  <dd>{s.recorderSerial || '—'}</dd>
                </div>
                <div>
                  <dt>Cloud / IP</dt>
                  <dd>{[s.cloudId, s.recorderIp].filter(Boolean).join(' · ') || '—'}</dd>
                </div>
                <div>
                  <dt>Storage</dt>
                  <dd>
                    {s.hddInstalled
                      ? `${s.hddCapacityGb ?? '?'} GB${s.hddSerial ? ` · ${s.hddSerial}` : ''}`
                      : 'No HDD logged'}
                  </dd>
                </div>
              </dl>
              <div className="cctv-system-card__cams">
                <strong>Cameras</strong>
                <ul>
                  {s.cameras.map((c) => (
                    <li key={c.id}>
                      <span>
                        Ch{c.channel} · {c.name}
                      </span>
                      <span className="text-muted">{c.serialNumber || 'No serial'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {s.techNotes ? (
                <p className="ops-safety-note">
                  <strong>Tech notes</strong>
                  {s.techNotes}
                </p>
              ) : null}
              {s.property?.id ? (
                <Link
                  href={`${CONTROL_ROOM_ROUTES.surveillance}/${s.property.id}`}
                  className="btn btn-ghost btn-sm"
                >
                  Open live site
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'ONLINE') return 'ok';
  if (status === 'FAULT') return 'danger';
  if (status === 'OFFLINE') return 'warn';
  return 'info';
}
