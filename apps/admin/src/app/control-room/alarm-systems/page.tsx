'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { UiSelect } from '@/components/ui/UiSelect';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { matchesSearch } from '@/lib/list-search';

type SiteType = { value: string; label: string };

type AlarmPreset = {
  id: string;
  label: string;
  brand: string;
  model: string;
  kitSku: string;
  supplier: string;
  connectivity: string;
  wirelessFrequency: string | null;
  wirelessCoding: string | null;
  gsmBands: string | null;
  wifiStandard: string | null;
  inputVoltage: string | null;
  backupBattery: string | null;
  icasaCert: string | null;
  rfidEnabled: boolean;
  touchKeypad: boolean;
  mobileAppEnabled: boolean;
  zoneCount: number;
};

type AlarmSystemRow = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  kitSku: string | null;
  supplier: string | null;
  connectivity: string;
  panelSerial: string | null;
  imei: string | null;
  simIccid: string | null;
  wifiMac: string | null;
  wifiSsid: string | null;
  cloudId: string | null;
  appAccount: string | null;
  wirelessFrequency: string | null;
  wirelessCoding: string | null;
  gsmBands: string | null;
  wifiStandard: string | null;
  inputVoltage: string | null;
  backupBattery: string | null;
  icasaCert: string | null;
  rfidEnabled: boolean;
  touchKeypad: boolean;
  mobileAppEnabled: boolean;
  zoneCount: number;
  firmware: string | null;
  techNotes: string | null;
  status: string;
  property: {
    id: string;
    name: string;
    address: string;
    propertyType: string;
    client: { id: string; name: string; email: string } | null;
  } | null;
};

type ListPayload = {
  presets: AlarmPreset[];
  siteTypes: SiteType[];
  systems: AlarmSystemRow[];
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
};

const CONNECTIVITY = [
  { value: 'WIFI_4G', label: 'WiFi + 4G dual' },
  { value: 'WIFI', label: 'WiFi only' },
  { value: 'GSM_4G', label: 'GSM / 4G only' },
  { value: 'ETHERNET', label: 'Ethernet' },
  { value: 'DUAL_PATH', label: 'Dual-path' },
  { value: 'RADIO', label: 'Radio' },
];

const STATUS_OPTIONS = [
  { value: 'COMMISSIONING', label: 'Commissioning' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'FAULT', label: 'Fault' },
];

function clientLabel(c: ClientRow) {
  return c.name || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email;
}

export default function AlarmSystemsPage() {
  return (
    <ControlRoomLayout title="Alarm systems">
      <AlarmSystemsContent />
    </ControlRoomLayout>
  );
}

function AlarmSystemsContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<ListPayload>>('/control-room/alarm-systems'),
    [],
  );
  const { data: clientsData } = useApi(
    () => adminApi.get<ApiResponse<ClientRow[]>>('/control-room/clients'),
    [],
  );
  const { data: surveillanceData } = useApi(
    () =>
      adminApi.get<ApiResponse<{ sites: PropertyOption[] }>>('/control-room/surveillance'),
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
  const [connectivity, setConnectivity] = useState('WIFI_4G');
  const [panelSerial, setPanelSerial] = useState('');
  const [imei, setImei] = useState('');
  const [simIccid, setSimIccid] = useState('');
  const [wifiMac, setWifiMac] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [cloudId, setCloudId] = useState('');
  const [appAccount, setAppAccount] = useState('');
  const [wirelessFrequency, setWirelessFrequency] = useState('');
  const [wirelessCoding, setWirelessCoding] = useState('');
  const [gsmBands, setGsmBands] = useState('');
  const [wifiStandard, setWifiStandard] = useState('');
  const [inputVoltage, setInputVoltage] = useState('');
  const [backupBattery, setBackupBattery] = useState('');
  const [icasaCert, setIcasaCert] = useState('');
  const [rfidEnabled, setRfidEnabled] = useState(true);
  const [touchKeypad, setTouchKeypad] = useState(true);
  const [mobileAppEnabled, setMobileAppEnabled] = useState(true);
  const [zoneCount, setZoneCount] = useState('0');
  const [firmware, setFirmware] = useState('');
  const [status, setStatus] = useState('COMMISSIONING');
  const [techNotes, setTechNotes] = useState('');

  const filtered = useMemo(
    () =>
      systems.filter((s) =>
        matchesSearch(
          search,
          s.name,
          s.brand,
          s.model,
          s.panelSerial,
          s.imei,
          s.cloudId,
          s.icasaCert,
          s.property?.name,
          s.property?.address,
          s.property?.propertyType,
          s.property?.client?.name,
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
    setConnectivity(preset.connectivity);
    setWirelessFrequency(preset.wirelessFrequency ?? '');
    setWirelessCoding(preset.wirelessCoding ?? '');
    setGsmBands(preset.gsmBands ?? '');
    setWifiStandard(preset.wifiStandard ?? '');
    setInputVoltage(preset.inputVoltage ?? '');
    setBackupBattery(preset.backupBattery ?? '');
    setIcasaCert(preset.icasaCert ?? '');
    setRfidEnabled(preset.rfidEnabled);
    setTouchKeypad(preset.touchKeypad);
    setMobileAppEnabled(preset.mobileAppEnabled);
    setZoneCount(String(preset.zoneCount ?? 0));
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
    setConnectivity('WIFI_4G');
    setPanelSerial('');
    setImei('');
    setSimIccid('');
    setWifiMac('');
    setWifiSsid('');
    setCloudId('');
    setAppAccount('');
    setWirelessFrequency('');
    setWirelessCoding('');
    setGsmBands('');
    setWifiStandard('');
    setInputVoltage('');
    setBackupBattery('');
    setIcasaCert('');
    setRfidEnabled(true);
    setTouchKeypad(true);
    setMobileAppEnabled(true);
    setZoneCount('0');
    setFirmware('');
    setStatus('COMMISSIONING');
    setTechNotes('');
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
          connectivity,
          panelSerial: panelSerial || undefined,
          imei: imei || undefined,
          simIccid: simIccid || undefined,
          wifiMac: wifiMac || undefined,
          wifiSsid: wifiSsid || undefined,
          cloudId: cloudId || undefined,
          appAccount: appAccount || undefined,
          wirelessFrequency: wirelessFrequency || undefined,
          wirelessCoding: wirelessCoding || undefined,
          gsmBands: gsmBands || undefined,
          wifiStandard: wifiStandard || undefined,
          inputVoltage: inputVoltage || undefined,
          backupBattery: backupBattery || undefined,
          icasaCert: icasaCert || undefined,
          rfidEnabled,
          touchKeypad,
          mobileAppEnabled,
          zoneCount: Number(zoneCount) || 0,
          firmware: firmware || undefined,
          techNotes: techNotes || undefined,
          status,
        },
      };
      const res = await adminApi.post<ApiResponse<AlarmSystemRow>>(
        '/control-room/alarm-systems',
        payload,
      );
      if (!res.success) throw new Error('Could not register alarm panel');
      setFormMsg(`Integrated ${res.data?.name ?? 'panel'} successfully.`);
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
    return <LoadingSpinner label="Loading alarm systems…" />;
  }

  return (
    <div className="ops-page cctv-systems-page">
      <header className="ops-page-header">
        <div>
          <h1 className="ops-page-header__title">Alarm systems</h1>
          <p className="ops-page-header__subtitle">
            Integrate panels like mixbox PG-103 (WiFi+4G), Paradox, and dual-path controllers —
            serial, IMEI, WiFi, and tech specs for the install team.
          </p>
        </div>
        <div className="ops-page-header__actions">
          <Link href={CONTROL_ROOM_ROUTES.cctvSystems} className="btn btn-ghost btn-sm">
            CCTV kits
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
            {showForm ? 'Close form' : 'Integrate panel'}
          </button>
        </div>
      </header>

      {error ? <ErrorAlert error={error} onRetry={() => void reload()} /> : null}
      {formMsg ? (
        <p className="text-muted" style={{ color: 'var(--success)' }}>
          {formMsg}
        </p>
      ) : null}

      {showForm ? (
        <form className="ops-panel cctv-reg-form" onSubmit={(e) => void onSubmit(e)}>
          <h2 className="ops-panel__title">Integrate alarm panel</h2>
          {formError ? <ErrorAlert error={formError} /> : null}

          <div className="cctv-reg-form__grid">
            <label className="login-field">
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
                <label className="login-field">
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
                <label className="login-field">
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
                          ]
                    }
                  />
                </label>
                <label className="login-field">
                  <span>Site name</span>
                  <input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Morningside Residence"
                    required
                  />
                </label>
                <label className="login-field cctv-reg-form__span2">
                  <span>Address</span>
                  <input
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    required
                  />
                </label>
                <label className="login-field">
                  <span>Gate / access code</span>
                  <input value={gateCode} onChange={(e) => setGateCode(e.target.value)} />
                </label>
                <label className="login-field">
                  <span>Access notes</span>
                  <input value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} />
                </label>
              </>
            ) : (
              <label className="login-field cctv-reg-form__span2">
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

          <h3 className="cctv-reg-form__section">Panel / controller</h3>
          <div className="cctv-reg-form__grid">
            <label className="login-field cctv-reg-form__span2">
              <span>Panel preset</span>
              <UiSelect
                value={presetId}
                onChange={applyPreset}
                options={[
                  { value: '', label: 'Custom / blank…' },
                  ...presets.map((p) => ({ value: p.id, label: p.label })),
                ]}
              />
            </label>
            <label className="login-field cctv-reg-form__span2">
              <span>System name</span>
              <input
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="mixbox WIFI+4G Dual Network Alarm Controller"
                required
              />
            </label>
            <label className="login-field">
              <span>Brand</span>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="mixbox" />
            </label>
            <label className="login-field">
              <span>Model</span>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="PG-103" />
            </label>
            <label className="login-field">
              <span>SKU</span>
              <input value={kitSku} onChange={(e) => setKitSku(e.target.value)} />
            </label>
            <label className="login-field">
              <span>Connectivity</span>
              <UiSelect value={connectivity} onChange={setConnectivity} options={CONNECTIVITY} />
            </label>
            <label className="login-field">
              <span>Status</span>
              <UiSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </label>
            <label className="login-field">
              <span>Panel serial</span>
              <input
                value={panelSerial}
                onChange={(e) => setPanelSerial(e.target.value)}
                placeholder="Required to connect the panel"
              />
            </label>
            <label className="login-field">
              <span>IMEI (4G)</span>
              <input value={imei} onChange={(e) => setImei(e.target.value)} />
            </label>
            <label className="login-field">
              <span>SIM ICCID</span>
              <input value={simIccid} onChange={(e) => setSimIccid(e.target.value)} />
            </label>
            <label className="login-field">
              <span>WiFi MAC</span>
              <input value={wifiMac} onChange={(e) => setWifiMac(e.target.value)} />
            </label>
            <label className="login-field">
              <span>WiFi SSID</span>
              <input value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} />
            </label>
            <label className="login-field">
              <span>Cloud / device ID</span>
              <input value={cloudId} onChange={(e) => setCloudId(e.target.value)} />
            </label>
            <label className="login-field">
              <span>App account</span>
              <input value={appAccount} onChange={(e) => setAppAccount(e.target.value)} />
            </label>
            <label className="login-field">
              <span>Wireless frequency</span>
              <input
                value={wirelessFrequency}
                onChange={(e) => setWirelessFrequency(e.target.value)}
                placeholder="433.92MHz"
              />
            </label>
            <label className="login-field">
              <span>Wireless coding</span>
              <input
                value={wirelessCoding}
                onChange={(e) => setWirelessCoding(e.target.value)}
                placeholder="EV1527"
              />
            </label>
            <label className="login-field">
              <span>GSM bands</span>
              <input value={gsmBands} onChange={(e) => setGsmBands(e.target.value)} placeholder="2G/4G" />
            </label>
            <label className="login-field">
              <span>WiFi standard</span>
              <input
                value={wifiStandard}
                onChange={(e) => setWifiStandard(e.target.value)}
                placeholder="IEEE802.11b/g/n"
              />
            </label>
            <label className="login-field">
              <span>Input voltage</span>
              <input
                value={inputVoltage}
                onChange={(e) => setInputVoltage(e.target.value)}
                placeholder="DC5V (TYPE-C)"
              />
            </label>
            <label className="login-field">
              <span>Backup battery</span>
              <input
                value={backupBattery}
                onChange={(e) => setBackupBattery(e.target.value)}
                placeholder="3.7V/1000mAh lithium"
              />
            </label>
            <label className="login-field">
              <span>ICASA cert</span>
              <input
                value={icasaCert}
                onChange={(e) => setIcasaCert(e.target.value)}
                placeholder="TA-2021/3152"
              />
            </label>
            <label className="login-field">
              <span>Zone count</span>
              <input
                type="number"
                min={0}
                max={128}
                value={zoneCount}
                onChange={(e) => setZoneCount(e.target.value)}
              />
            </label>
            <label className="login-field">
              <span>Firmware</span>
              <input value={firmware} onChange={(e) => setFirmware(e.target.value)} />
            </label>
            <label className="login-field cctv-reg-form__check">
              <input
                type="checkbox"
                checked={rfidEnabled}
                onChange={(e) => setRfidEnabled(e.target.checked)}
              />
              <span>RFID enabled</span>
            </label>
            <label className="login-field cctv-reg-form__check">
              <input
                type="checkbox"
                checked={touchKeypad}
                onChange={(e) => setTouchKeypad(e.target.checked)}
              />
              <span>Touch keypad</span>
            </label>
            <label className="login-field cctv-reg-form__check">
              <input
                type="checkbox"
                checked={mobileAppEnabled}
                onChange={(e) => setMobileAppEnabled(e.target.checked)}
              />
              <span>Mobile app enabled</span>
            </label>
            <label className="login-field cctv-reg-form__span2">
              <span>Tech notes</span>
              <textarea
                value={techNotes}
                onChange={(e) => setTechNotes(e.target.value)}
                rows={3}
                placeholder="Siren wiring, RFID tags programmed, app login location, SIM APN…"
              />
            </label>
          </div>

          <div className="cctv-reg-form__actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save alarm panel'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="ops-toolbar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search brand, serial, IMEI, site…"
        />
      </div>

      {!filtered.length ? (
        <EmptyState
          title="No alarm panels integrated yet"
          body="Integrate a mixbox PG-103 or other panel against a house, store, mall or branch."
        />
      ) : (
        <div className="cctv-system-grid">
          {filtered.map((s) => (
            <article key={s.id} className="ops-panel cctv-system-card">
              <header className="cctv-system-card__head">
                <div>
                  <h3>{s.name}</h3>
                  <p className="text-muted">
                    {[s.brand, s.model].filter(Boolean).join(' · ') || 'Custom panel'}
                    {s.kitSku ? ` · ${s.kitSku}` : ''}
                  </p>
                </div>
                <span className={`ops-status ops-status--${statusTone(s.status)}`}>{s.status}</span>
              </header>
              <dl className="cctv-system-card__facts">
                <div>
                  <dt>Site</dt>
                  <dd>
                    {s.property?.name ?? '—'}
                    <span className="text-muted"> · {s.property?.propertyType ?? '—'}</span>
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
                  <dt>Link</dt>
                  <dd>{s.connectivity.replace(/_/g, ' ')}</dd>
                </div>
                <div>
                  <dt>Panel serial</dt>
                  <dd>{s.panelSerial || '—'}</dd>
                </div>
                <div>
                  <dt>IMEI / SIM</dt>
                  <dd>{[s.imei, s.simIccid].filter(Boolean).join(' · ') || '—'}</dd>
                </div>
                <div>
                  <dt>WiFi</dt>
                  <dd>{[s.wifiSsid, s.wifiMac].filter(Boolean).join(' · ') || '—'}</dd>
                </div>
                <div>
                  <dt>Cloud / app</dt>
                  <dd>{[s.cloudId, s.appAccount].filter(Boolean).join(' · ') || '—'}</dd>
                </div>
                <div>
                  <dt>RF / coding</dt>
                  <dd>
                    {[s.wirelessFrequency, s.wirelessCoding].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Power</dt>
                  <dd>
                    {[s.inputVoltage, s.backupBattery].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt>ICASA</dt>
                  <dd>{s.icasaCert || '—'}</dd>
                </div>
                <div>
                  <dt>Features</dt>
                  <dd>
                    {[
                      s.rfidEnabled ? 'RFID' : null,
                      s.touchKeypad ? 'Touch keypad' : null,
                      s.mobileAppEnabled ? 'App' : null,
                      s.zoneCount ? `${s.zoneCount} zones` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </dd>
                </div>
              </dl>
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
