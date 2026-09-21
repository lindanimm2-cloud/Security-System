'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';
import { UiSelect } from '@/components/ui/UiSelect';
import { CameraPlaceSelect, CameraZoneSelect, type CameraPlacement } from '@/components/ui/CameraPlaceSelect';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';
import { EmptyState } from '@/components/ui/EmptyState';
import { OpsDialog } from '@/components/ops/OpsDialog';

type PropertyRow = {
  id: string;
  name: string;
  address: string;
  camerasLinked: boolean;
  cameraCount: number;
  clientName: string;
};

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

type CctvSystemRow = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  kitSku: string | null;
  channelCount: number;
  recorderSerial: string | null;
  status: string;
  property: {
    id: string;
    name: string;
    address: string;
    client: { id: string; name: string; email: string } | null;
  } | null;
  cameras: Array<{ id: string; name: string; channel: number; status: string }>;
};

type KitsPayload = {
  presets: KitPreset[];
  systems: CctvSystemRow[];
};

export default function TechCamerasPage() {
  return (
    <TechLayout title="CCTV kits">
      <TechCamerasContent />
    </TechLayout>
  );
}

function TechCamerasContent() {
  const {
    data: propsData,
    loading: propsLoading,
    error: propsError,
    reload: reloadProps,
  } = useApi(
    () => techApi.get<ApiResponse<PropertyRow[]>>('/store/tech/properties'),
    [],
  );
  const {
    data: kitsData,
    loading: kitsLoading,
    error: kitsError,
    reload: reloadKits,
  } = useApi(
    () => techApi.get<ApiResponse<KitsPayload>>('/store/tech/cctv-systems'),
    [],
  );

  const [propertyId, setPropertyId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [name, setName] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [channel, setChannel] = useState('1');
  const [serialNumber, setSerialNumber] = useState('');
  const [placement, setPlacement] = useState<CameraPlacement>('EXTERIOR');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const [presetId, setPresetId] = useState('');
  const [kitPropertyId, setKitPropertyId] = useState('');
  const [recorderSerial, setRecorderSerial] = useState('');
  const [kitName, setKitName] = useState('');

  const properties = useMemo(
    () => (Array.isArray(propsData?.data) ? propsData.data : []),
    [propsData],
  );
  const kitsPayload = kitsData?.data;
  const systems = kitsPayload?.systems ?? [];
  const presets = kitsPayload?.presets ?? [];

  const filteredProperties = properties.filter((p) =>
    matchesSearch(search, p.name, p.address, p.clientName, p.cameraCount, p.camerasLinked),
  );
  const filteredSystems = systems.filter((s) =>
    matchesSearch(
      search,
      s.name,
      s.brand,
      s.model,
      s.kitSku,
      s.recorderSerial,
      s.property?.name,
      s.property?.client?.name,
    ),
  );

  function openCommissionForm(nextPropertyId = '', nextSystemId = '') {
    setPropertyId(nextPropertyId);
    setSystemId(nextSystemId);
    setName('');
    setLocationLabel('');
    setChannel('1');
    setSerialNumber('');
    setPlacement('EXTERIOR');
    setActionError('');
    setCommissionOpen(true);
  }

  function openKitForm(nextPropertyId = '') {
    setKitPropertyId(nextPropertyId);
    setPresetId(presets[0]?.id ?? '');
    setKitName(presets[0]?.label ?? '');
    setRecorderSerial('');
    setActionError('');
    setKitOpen(true);
  }

  async function commission(e: FormEvent) {
    e.preventDefault();
    if (!propertyId || !name.trim() || !locationLabel.trim()) return;
    setBusy(true);
    setActionError('');
    setMsg('');
    try {
      await techApi.post(`/store/tech/properties/${propertyId}/cameras`, {
        cameras: [
          {
            name: name.trim(),
            locationLabel: locationLabel.trim(),
            channel: Number(channel) || 1,
            placement,
            serialNumber: serialNumber.trim() || undefined,
            vendor: '4DS Nexus',
            systemId: systemId || undefined,
          },
        ],
      });
      setMsg(
        placement === 'INTERIOR'
          ? 'Interior camera commissioned (private until client shares or panic/alarm).'
          : 'Camera commissioned and linked for monitoring.',
      );
      setCommissionOpen(false);
      reloadProps();
      reloadKits();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Commission failed');
    } finally {
      setBusy(false);
    }
  }

  async function registerKit(e: FormEvent) {
    e.preventDefault();
    const preset = presets.find((p) => p.id === presetId);
    if (!kitPropertyId || !preset) {
      setActionError('Select a property and kit preset.');
      return;
    }
    setBusy(true);
    setActionError('');
    setMsg('');
    try {
      await techApi.post('/store/tech/cctv-systems', {
        propertyId: kitPropertyId,
        system: {
          name: kitName.trim() || preset.label,
          brand: preset.brand,
          model: preset.model,
          kitSku: preset.kitSku,
          recorderType: preset.recorderType,
          channelCount: preset.channelCount,
          connectivity: preset.connectivity,
          recorderSerial: recorderSerial.trim() || undefined,
          hddInstalled: preset.hddInstalled,
          mobileAppEnabled: preset.mobileAppEnabled,
          status: 'COMMISSIONING',
          techNotes: 'Registered from technician portal',
        },
        cameras: preset.cameraLabels.map((label, index) => ({
          name: label,
          locationLabel: label,
          channel: index + 1,
          placement: /interior|inside|bedroom|lounge|office/i.test(label)
            ? 'INTERIOR'
            : 'EXTERIOR',
          model: preset.model,
          resolution: preset.resolution,
          vendor: preset.brand,
        })),
      });
      setMsg(`CCTV kit “${kitName.trim() || preset.label}” registered.`);
      setKitOpen(false);
      reloadProps();
      reloadKits();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Kit registration failed');
    } finally {
      setBusy(false);
    }
  }

  if (propsLoading || kitsLoading) return <LoadingSpinner label="Loading CCTV sites…" />;
  if (propsError || !propsData) {
    return <ErrorAlert message={propsError ?? 'Failed to load properties'} onRetry={reloadProps} />;
  }

  const systemsForProperty = systemId
    ? systems.filter((s) => s.property?.id === propertyId || s.id === systemId)
    : systems.filter((s) => !propertyId || s.property?.id === propertyId);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>CCTV kits &amp; cameras</h1>
          <p className="text-muted">
            Register installed kits (HiLook, Dahua, Pro View) and commission channels onto client sites.
          </p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn-secondary btn-sm" onClick={() => openKitForm()}>
            + Register kit
          </button>
          <button type="button" className="btn-primary btn-sm" onClick={() => openCommissionForm()}>
            + Commission camera
          </button>
        </div>
      </div>

      {msg && <div className="alert alert--success">{msg}</div>}
      {actionError && !commissionOpen && !kitOpen ? <ErrorAlert message={actionError} /> : null}
      {kitsError ? (
        <ErrorAlert message={kitsError} onRetry={reloadKits} />
      ) : null}

      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search kits, properties, client, serial…"
          resultCount={filteredSystems.length + filteredProperties.length}
          totalCount={systems.length + properties.length}
        />
      </div>

      {kitOpen && (
        <OpsDialog
          title="Register CCTV kit"
          subtitle="Create the recorder kit and channel labels for this site."
          onClose={() => setKitOpen(false)}
          wide
        >
          {actionError && <ErrorAlert message={actionError} />}
          <form className="stack-form" onSubmit={registerKit}>
            <label>
              Property
              <UiSelect
                compact={false}
                ariaLabel="Property"
                value={kitPropertyId}
                onChange={setKitPropertyId}
                options={[
                  { value: '', label: 'Select property…' },
                  ...properties.map((p) => ({
                    value: p.id,
                    label: `${p.name} — ${p.clientName}`,
                    meta: `${p.cameraCount} cams`,
                  })),
                ]}
              />
            </label>
            <label>
              Kit preset
              <UiSelect
                compact={false}
                ariaLabel="Kit preset"
                value={presetId}
                onChange={(value) => {
                  setPresetId(value);
                  const preset = presets.find((p) => p.id === value);
                  if (preset) setKitName(preset.label);
                }}
                options={[
                  { value: '', label: 'Select preset…' },
                  ...presets.map((p) => ({
                    value: p.id,
                    label: p.label,
                    meta: `${p.channelCount} ch · ${p.connectivity}`,
                  })),
                ]}
              />
            </label>
            <div className="form-row-2">
              <label>
                Kit name
                <input
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value)}
                  placeholder="Site DVR kit"
                  required
                />
              </label>
              <label>
                Recorder serial
                <input
                  value={recorderSerial}
                  onChange={(e) => setRecorderSerial(e.target.value)}
                  placeholder="DVR / NVR serial"
                />
              </label>
            </div>
            <div className="fleet-form__actions">
              <button type="button" className="btn-ghost" onClick={() => setKitOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Register kit'}
              </button>
            </div>
          </form>
        </OpsDialog>
      )}

      {commissionOpen && (
        <OpsDialog
          title="Commission camera"
          subtitle="Link an installed CCTV channel to a client property / kit."
          onClose={() => setCommissionOpen(false)}
          wide
        >
          {actionError && <ErrorAlert message={actionError} />}
          <form className="stack-form" onSubmit={commission}>
            <label>
              Property
              <UiSelect
                compact={false}
                ariaLabel="Property"
                value={propertyId}
                onChange={(value) => {
                  setPropertyId(value);
                  setSystemId('');
                }}
                options={[
                  { value: '', label: 'Select property…' },
                  ...properties.map((p) => ({
                    value: p.id,
                    label: `${p.name} — ${p.clientName}`,
                    meta: `${p.cameraCount} cams`,
                  })),
                ]}
              />
            </label>
            <label>
              CCTV kit (optional)
              <UiSelect
                compact={false}
                ariaLabel="CCTV kit"
                value={systemId}
                onChange={setSystemId}
                options={[
                  { value: '', label: 'No kit / standalone channel' },
                  ...systemsForProperty.map((s) => ({
                    value: s.id,
                    label: s.name,
                    meta: `${s.cameras.length}/${s.channelCount} ch`,
                  })),
                ]}
              />
            </label>
            <div className="form-row-2">
              <label>
                Camera name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Front gate"
                  required
                  autoComplete="off"
                />
              </label>
              <label>
                Place
                <CameraPlaceSelect
                  compact={false}
                  value={locationLabel}
                  ariaLabel="Camera place"
                  onChange={({ locationLabel: next, placement: nextPlacement }) => {
                    setLocationLabel(next);
                    if (nextPlacement) setPlacement(nextPlacement);
                    if (next && (!name.trim() || name === locationLabel)) setName(next);
                  }}
                />
              </label>
            </div>
            <div className="form-row-2">
              <label>
                Channel
                <input
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  type="number"
                  min={1}
                  max={64}
                  inputMode="numeric"
                />
              </label>
              <label>
                Camera serial
                <input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="SN / barcode"
                  autoComplete="off"
                />
              </label>
            </div>
            <label>
              Zone
              <CameraZoneSelect
                compact={false}
                ariaLabel="Camera zone"
                value={placement}
                onChange={setPlacement}
              />
            </label>
            <div className="fleet-form__actions">
              <button type="button" className="btn-ghost" onClick={() => setCommissionOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Commission camera'}
              </button>
            </div>
          </form>
        </OpsDialog>
      )}

      <section className="portal-card">
        <div className="card-header-row">
          <h2>Registered kits</h2>
          <Link href="/tech/jobs" className="link-sm">
            Back to jobs
          </Link>
        </div>
        {filteredSystems.length === 0 ? (
          <EmptyState
            title={search.trim() ? 'No matching kits' : 'No CCTV kits yet'}
            body={
              search.trim()
                ? 'Try another site, brand, or serial.'
                : 'Register a kit after you install the recorder on site.'
            }
          />
        ) : (
          <ul className="status-list">
            {filteredSystems.map((s) => (
              <li key={s.id} className="status-list-item">
                <div>
                  <strong>{s.name}</strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    {s.property?.name ?? 'Unknown site'}
                    {s.property?.client?.name ? ` · ${s.property.client.name}` : ''}
                    {s.brand ? ` · ${s.brand}` : ''}
                    {s.recorderSerial ? ` · SN ${s.recorderSerial}` : ''}
                  </p>
                </div>
                <div className="status-list-item__actions">
                  <span className="badge">
                    {s.cameras.length}/{s.channelCount} ch · {s.status}
                  </span>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    onClick={() => openCommissionForm(s.property?.id ?? '', s.id)}
                  >
                    Add channel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="portal-card">
        <h2>Properties</h2>
        {filteredProperties.length === 0 ? (
          <EmptyState
            title={search.trim() ? 'No matches' : 'No properties'}
            body={search.trim() ? 'Try a different site or client name.' : 'No properties assigned yet.'}
          />
        ) : (
          <ul className="status-list">
            {filteredProperties.map((p) => (
              <li key={p.id} className="status-list-item">
                <div>
                  <strong>{p.name}</strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    {p.clientName} · {p.address}
                  </p>
                </div>
                <div className="status-list-item__actions">
                  <span className="badge">{p.cameraCount} linked</span>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    onClick={() => openKitForm(p.id)}
                  >
                    Register kit
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-primary"
                    onClick={() => openCommissionForm(p.id)}
                  >
                    Commission
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
