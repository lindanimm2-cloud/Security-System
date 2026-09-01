'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { HoldToActivate } from '@/components/ops/EmergencyMode';
import { UiSelect } from '@/components/ui/UiSelect';
import { VehicleRemotePad } from '@/components/vehicle/VehicleRemotePad';
import { useApi } from '@/hooks/useApi';
import { usePlatformEvents } from '@/hooks/usePlatformEvents';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import {
  ARM_MODE_OPTIONS,
  alarmStatusLabel,
  type ArmMode,
} from '@/lib/sa-alarm';
import {
  subscribeVehicleFocus,
  type VehicleRemoteAction,
} from '@/lib/vehicle-remote';

type SitePreview = {
  id: string;
  name: string;
  alarmStatus: string;
  cameraCount: number;
  onlineCameras: number;
  cameras?: CctvCamera[];
};

type Overview = {
  stats: { cameras: number; offlineCameras: number; triggeredSites: number };
  sites: SitePreview[];
};

type FleetVehicle = {
  id: string;
  callSign: string;
  registration: string;
  status: string;
  cameras?: CctvCamera[];
};

type ClientVehicle = {
  id: string;
  callSign: string;
  registration: string;
  make?: string;
  model?: string;
  owner?: string;
  status: string;
  theftRecovery: boolean;
  immobiliserOn: boolean;
  doorsLocked: boolean;
  hornActive?: boolean;
  panicFocus?: boolean;
  cameras?: CctvCamera[];
};

type FeedTab = 'sites' | 'dash';
type DashSource = (FleetVehicle | ClientVehicle) & { source: 'fleet' | 'client' };

const OPS_ALARM_ACTIONS = [
  ...ARM_MODE_OPTIONS.filter((opt) => opt.value === 'DISARMED'),
  ...ARM_MODE_OPTIONS.filter((opt) => opt.value !== 'DISARMED'),
];

export function DashboardCctvWall() {
  const { data, loading, reload } = useApi(
    () => adminApi.get<ApiResponse<Overview>>('/control-room/surveillance'),
    [],
  );
  const { data: fleetData, reload: reloadFleet } = useApi(
    () => adminApi.get<ApiResponse<FleetVehicle[]>>('/control-room/fleet'),
    [],
  );
  const { data: clientData, reload: reloadClients } = useApi(
    () => adminApi.get<ApiResponse<ClientVehicle[]>>('/control-room/client-vehicles'),
    [],
  );
  const [tab, setTab] = useState<FeedTab>('dash');
  const [focusVehicleId, setFocusVehicleId] = useState<string | null>(null);
  const [pickedVehicleId, setPickedVehicleId] = useState<string | null>(null);
  const [pickedSiteId, setPickedSiteId] = useState<string | null>(null);
  const [remoteBusy, setRemoteBusy] = useState<VehicleRemoteAction | null>(null);
  const [remoteNote, setRemoteNote] = useState('');
  const [alarmBusy, setAlarmBusy] = useState<ArmMode | 'SIREN' | null>(null);
  const [alarmNote, setAlarmNote] = useState('');
  const [alarmOverride, setAlarmOverride] = useState<Record<string, string>>({});

  const refresh = useCallback(() => {
    void reload({ silent: true });
    void reloadFleet({ silent: true });
    void reloadClients({ silent: true });
  }, [reload, reloadFleet, reloadClients]);

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => refresh(), 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    return subscribeVehicleFocus((detail) => {
      setFocusVehicleId(detail.vehicleId);
      setPickedVehicleId(detail.vehicleId);
      setTab('dash');
      if (detail.action === 'panic') {
        setRemoteNote(`Vehicle panic — ${detail.registration}. Dash cameras switched.`);
      }
      void reloadClients({ silent: true });
    });
  }, [reloadClients]);

  usePlatformEvents('admin', ['vehicle.panic', 'vehicle.remote'], (payload) => {
    const vehicleId = typeof payload.vehicleId === 'string' ? payload.vehicleId : null;
    if (!vehicleId) return;
    setFocusVehicleId(vehicleId);
    setPickedVehicleId(vehicleId);
    setTab('dash');
    if (payload.event === 'vehicle.panic' || payload.action === 'panic') {
      const plate = typeof payload.registration === 'string' ? payload.registration : 'vehicle';
      setRemoteNote(`Vehicle panic — ${plate}. Dash cameras switched.`);
    }
    void reloadClients({ silent: true });
  });

  const sites = Array.isArray(data?.data?.sites) ? data.data.sites : [];
  const fleet = Array.isArray(fleetData?.data) ? fleetData.data : [];
  const clientVehicles = Array.isArray(clientData?.data) ? clientData.data : [];

  const dashUnits = useMemo<DashSource[]>(() => {
    const clients: DashSource[] = clientVehicles.map((v) => ({ ...v, source: 'client' as const }));
    const company: DashSource[] = fleet
      .filter((v) => (v.cameras?.length ?? 0) > 0)
      .map((v) => ({ ...v, source: 'fleet' as const }));
    return [...clients, ...company];
  }, [clientVehicles, fleet]);

  const siteChoices = sites;

  const selectedUnit =
    dashUnits.find((u) => u.id === (focusVehicleId ?? pickedVehicleId)) ?? dashUnits[0] ?? null;
  const selectedSite =
    siteChoices.find((s) => s.id === pickedSiteId) ??
    siteChoices.find((s) => (alarmOverride[s.id] ?? s.alarmStatus) === 'TRIGGERED') ??
    siteChoices.find((s) => (s.cameras?.length ?? 0) > 0) ??
    siteChoices[0] ??
    null;

  const focusedClient =
    selectedUnit?.source === 'client'
      ? (clientVehicles.find((v) => v.id === selectedUnit.id) ?? null)
      : null;
  const usingDash = tab === 'dash';
  const siteCameras = (selectedSite?.cameras ?? []).slice(0, 4);
  const dashCameras = (selectedUnit?.cameras ?? []).slice(0, 4);
  const cameras = usingDash ? dashCameras : siteCameras;
  const primary = cameras[0];
  const rest = cameras.slice(1, 4);
  const href = usingDash
    ? focusedClient
      ? CONTROL_ROOM_ROUTES.map
      : CONTROL_ROOM_ROUTES.fleet
    : selectedSite
      ? `${CONTROL_ROOM_ROUTES.surveillance}/${selectedSite.id}`
      : CONTROL_ROOM_ROUTES.surveillance;

  const siteStatus = selectedSite
    ? (alarmOverride[selectedSite.id] ?? selectedSite.alarmStatus)
    : 'DISARMED';
  const siteOnline = selectedSite ? `${selectedSite.onlineCameras}/${selectedSite.cameraCount}` : '0/0';
  const dashOnline = dashCameras.filter((c) => {
    const s = (c.status ?? 'OFFLINE').toUpperCase();
    return s === 'ONLINE' || s === 'RECORDING';
  }).length;

  async function sendRemote(action: VehicleRemoteAction): Promise<boolean> {
    if (!focusedClient) return false;
    setRemoteBusy(action);
    setRemoteNote('');
    try {
      const res = await adminApi.post<ApiResponse<{ message?: string }>>(
        `/control-room/client-vehicles/${focusedClient.id}/remote`,
        { action },
      );
      setRemoteNote(res.data?.message ?? 'Command sent.');
      refresh();
      return true;
    } catch {
      setRemoteNote('Remote command failed.');
      return false;
    } finally {
      setRemoteBusy(null);
    }
  }

  async function setSiteAlarm(mode: ArmMode) {
    if (!selectedSite) return;
    setAlarmBusy(mode);
    setAlarmNote('');
    setPickedSiteId(selectedSite.id);
    setAlarmOverride((prev) => ({ ...prev, [selectedSite.id]: mode }));
    try {
      await adminApi.patch(`/control-room/surveillance/sites/${selectedSite.id}/alarm`, {
        status: mode,
      });
      setAlarmNote(`${selectedSite.name}: ${alarmStatusLabel(mode)}.`);
      refresh();
    } catch {
      setAlarmOverride((prev) => {
        const next = { ...prev };
        delete next[selectedSite.id];
        return next;
      });
      setAlarmNote('Alarm command failed.');
    } finally {
      setAlarmBusy(null);
    }
  }

  async function soundSiteSiren() {
    if (!selectedSite) return;
    setAlarmBusy('SIREN');
    setAlarmNote('');
    setPickedSiteId(selectedSite.id);
    setAlarmOverride((prev) => ({ ...prev, [selectedSite.id]: 'TRIGGERED' }));
    try {
      const res = await adminApi.post<ApiResponse<{ message?: string }>>(
        `/control-room/surveillance/sites/${selectedSite.id}/siren`,
      );
      setAlarmNote(res.data?.message ?? `Siren sounding at ${selectedSite.name}. Disarm to silence.`);
      refresh();
    } catch {
      setAlarmOverride((prev) => {
        const next = { ...prev };
        delete next[selectedSite.id];
        return next;
      });
      setAlarmNote('Siren command failed.');
    } finally {
      setAlarmBusy(null);
    }
  }

  const dashLabel = usingDash
    ? selectedUnit
      ? selectedUnit.source === 'client'
        ? `${selectedUnit.registration}${focusedClient?.owner ? ` · ${focusedClient.owner}` : ''} · ${dashOnline}/${Math.max(dashCameras.length, 1)} live`
        : `${selectedUnit.callSign} dash cam · ${dashOnline}/${dashCameras.length} online`
      : loading
        ? 'Loading dash cams…'
        : 'No vehicles with footage'
    : selectedSite
      ? `${selectedSite.name} · ${siteOnline} online · ${alarmStatusLabel(siteStatus)}`
      : loading
        ? 'Loading cameras…'
        : 'Live site cameras';

  function pickVehicle(id: string) {
    setFocusVehicleId(null);
    setPickedVehicleId(id);
    setTab('dash');
    setRemoteNote('');
  }

  function pickSite(id: string) {
    setPickedSiteId(id);
    setTab('sites');
    setAlarmNote('');
  }

  function jumpTo(value: string) {
    if (value.startsWith('dash:')) pickVehicle(value.slice(5));
    else if (value.startsWith('site:')) pickSite(value.slice(5));
  }

  const jumpValue = usingDash
    ? selectedUnit
      ? `dash:${selectedUnit.id}`
      : ''
    : selectedSite
      ? `site:${selectedSite.id}`
      : '';
  const siteArmed = Boolean(selectedSite && siteStatus !== 'DISARMED');
  const siteHot = siteStatus === 'TRIGGERED';

  return (
    <section className="ops-board__cctv" aria-label="CCTV footage">
      <div className="ops-cctv__toolbar">
        <div className="ops-cctv__tabs" role="tablist" aria-label="Camera source">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'dash'}
            className={`ops-cctv__tab ${tab === 'dash' ? 'ops-cctv__tab--on' : ''}`}
            onClick={() => {
              setTab('dash');
              setPickedVehicleId((id) => id ?? selectedUnit?.id ?? null);
            }}
          >
            Dash cams
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sites'}
            className={`ops-cctv__tab ${tab === 'sites' ? 'ops-cctv__tab--on' : ''}`}
            onClick={() => {
              setTab('sites');
              setPickedSiteId((id) => id ?? selectedSite?.id ?? null);
            }}
          >
            Sites
          </button>
        </div>
        <UiSelect
          className="ops-cctv__jump"
          panelClassName="ops-cctv__jump-panel"
          ariaLabel="Switch vehicle or site"
          placeholder="Jump to…"
          searchPlaceholder="Find vehicle or site"
          value={jumpValue}
          onChange={jumpTo}
          options={[
            ...dashUnits.map((unit) => ({
              value: `dash:${unit.id}`,
              label: unit.registration || unit.callSign,
              meta:
                unit.source === 'client' && 'owner' in unit && unit.owner
                  ? String(unit.owner)
                  : undefined,
              group: 'Vehicles',
            })),
            ...siteChoices.map((site) => {
              const status = alarmOverride[site.id] ?? site.alarmStatus;
              return {
                value: `site:${site.id}`,
                label: site.name,
                meta: alarmStatusLabel(status),
                group: 'Sites',
                tone:
                  status === 'TRIGGERED'
                    ? ('danger' as const)
                    : status === 'DISARMED'
                      ? ('ok' as const)
                      : undefined,
              };
            }),
          ]}
        />
        {!usingDash && selectedSite && !siteHot ? (
          <HoldToActivate
            className="hold-activate--inline ops-cctv__siren-quick"
            label="Siren"
            holdLabel="Hold…"
            holdMs={1200}
            hideHint
            keepLabel
            loading={alarmBusy === 'SIREN'}
            disabled={alarmBusy != null}
            onActivate={() => void soundSiteSiren()}
          />
        ) : null}
        {!usingDash && siteArmed ? (
          <button
            type="button"
            className={`ops-cctv__disarm-quick ${siteHot ? 'ops-cctv__disarm-quick--hot' : ''}`}
            disabled={alarmBusy != null}
            onClick={() => void setSiteAlarm('DISARMED')}
          >
            {alarmBusy === 'DISARMED' ? '…' : 'Disarm'}
          </button>
        ) : null}
        <Link
          href={usingDash ? CONTROL_ROOM_ROUTES.fleet : CONTROL_ROOM_ROUTES.surveillance}
          className="link-sm ops-cctv__more"
        >
          {usingDash ? 'Fleet' : 'All sites'}
        </Link>
      </div>

      <div className="ops-cctv__sources" role="listbox" aria-label={usingDash ? 'Vehicles' : 'Sites'}>
        {usingDash
          ? dashUnits.map((unit) => {
              const on = selectedUnit?.id === unit.id;
              const hot =
                unit.id === focusVehicleId ||
                (unit.source === 'client' && 'panicFocus' in unit && unit.panicFocus);
              return (
                <button
                  key={`${unit.source}-${unit.id}`}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`ops-cctv__chip ${on ? 'ops-cctv__chip--on' : ''} ${hot ? 'ops-cctv__chip--hot' : ''}`}
                  onClick={() => pickVehicle(unit.id)}
                >
                  {unit.registration || unit.callSign}
                </button>
              );
            })
          : siteChoices.map((site) => {
              const on = selectedSite?.id === site.id;
              const status = alarmOverride[site.id] ?? site.alarmStatus;
              const hot = status === 'TRIGGERED';
              return (
                <button
                  key={site.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`ops-cctv__chip ${on ? 'ops-cctv__chip--on' : ''} ${hot ? 'ops-cctv__chip--hot' : ''}`}
                  onClick={() => pickSite(site.id)}
                >
                  {site.name}
                </button>
              );
            })}
        {!loading && (usingDash ? dashUnits.length === 0 : siteChoices.length === 0) ? (
          <span className="ops-cctv__chip ops-cctv__chip--empty">
            {usingDash ? 'No vehicles' : 'No sites'}
          </span>
        ) : null}
      </div>

      <p className="ops-cctv__meta">{dashLabel}</p>

      {!primary ? (
        <div className="ops-cctv ops-cctv--empty">
          <strong>{loading ? 'Loading footage…' : usingDash ? 'No dash cam on this unit' : 'No live cameras'}</strong>
          <p className="text-muted">
            {loading
              ? 'Pulling live feeds.'
              : usingDash
                ? 'Remote commands still work if the tracker is linked.'
                : 'Link site cameras to show footage here.'}
          </p>
        </div>
      ) : (
        <div className="ops-cctv">
          <CctvLiveFeed camera={primary} href={href} featured />
          {rest.length > 0 ? (
            <div className="ops-cctv__strip">
              {rest.map((c) => (
                <CctvLiveFeed key={c.id} camera={c} href={href} />
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="ops-cctv__dock">
        {usingDash && focusedClient ? (
          <>
            {remoteNote ? <p className="ops-cctv__dock-note">{remoteNote}</p> : null}
            <VehicleRemotePad
              variant="ops"
              compact
              state={{
                doorsLocked: focusedClient.doorsLocked ?? true,
                immobiliserOn: focusedClient.immobiliserOn ?? false,
                theftRecovery: focusedClient.theftRecovery ?? false,
                hornActive: focusedClient.hornActive ?? false,
              }}
              busyAction={remoteBusy}
              onCommand={(action) => sendRemote(action)}
            />
          </>
        ) : usingDash ? (
          <p className="ops-cctv__dock-empty">Company unit — no client remote on this feed.</p>
        ) : selectedSite ? (
          <div className="ops-cctv__alarm">
            <div className="ops-cctv__alarm-head">
              <p className="ops-cctv__alarm-kicker">House alarm</p>
              <span
                className={`status-pill ${
                  siteHot
                    ? 'status-pill--alert'
                    : siteStatus === 'DISARMED'
                      ? 'status-pill--ok'
                      : 'status-pill--armed'
                }`}
              >
                {alarmStatusLabel(siteStatus)}
              </span>
            </div>
            {alarmNote ? <p className="ops-cctv__dock-note">{alarmNote}</p> : null}
            {siteHot ? (
              <button
                type="button"
                className="ops-cctv__disarm ops-cctv__disarm--hot"
                disabled={alarmBusy != null}
                onClick={() => void setSiteAlarm('DISARMED')}
              >
                {alarmBusy === 'DISARMED' ? 'Silencing…' : 'Silence siren · Disarm'}
              </button>
            ) : (
              <>
                <HoldToActivate
                  className="hold-activate--inline ops-cctv__siren"
                  label="Sound siren on property"
                  holdLabel="Hold to sound siren…"
                  holdMs={1200}
                  hideHint
                  loading={alarmBusy === 'SIREN'}
                  disabled={alarmBusy != null}
                  onActivate={() => void soundSiteSiren()}
                />
                <p className="ops-cctv__siren-hint">Works while disarmed if CCTV shows a break-in.</p>
              </>
            )}
            {siteArmed && !siteHot ? (
              <button
                type="button"
                className="ops-cctv__disarm"
                disabled={alarmBusy != null}
                onClick={() => void setSiteAlarm('DISARMED')}
              >
                {alarmBusy === 'DISARMED' ? 'Disarming…' : 'Disarm now'}
              </button>
            ) : null}
            {siteHot ? null : (
            <div className="ops-cctv__alarm-row" role="group" aria-label="Alarm mode">
              {OPS_ALARM_ACTIONS.map((opt) => {
                const active = siteStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`ops-cctv__alarm-btn ops-cctv__alarm-btn--${opt.colorKey} ${active ? 'ops-cctv__alarm-btn--on' : ''}`}
                    disabled={alarmBusy != null || active}
                    onClick={() => void setSiteAlarm(opt.value)}
                  >
                    {alarmBusy === opt.value ? '…' : opt.label}
                  </button>
                );
              })}
            </div>
            )}
          </div>
        ) : (
          <p className="ops-cctv__dock-empty">Select a site to arm or disarm the panel.</p>
        )}
      </div>
    </section>
  );
}
