'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { OpsActivityRow, OpsStatusBadge } from '@/components/ops/OpsUi';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { VehicleRemotePad } from '@/components/vehicle/VehicleRemotePad';
import { VehicleRemoteVisual } from '@/components/vehicle/VehicleRemoteVisual';
import { ListSearch } from '@/components/ui/ListSearch';
import { UiSelect } from '@/components/ui/UiSelect';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { FLEET_TEAMS, fleetTeamDuty, fleetTeamLabel } from '@/lib/fleet-teams';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { matchesSearch } from '@/lib/list-search';
import { officerStatusLabel } from '@/lib/officer-status';
import type { VehicleRemoteAction, VehicleRemoteState } from '@/lib/vehicle-remote';

type CrewMember = {
  officerId: string;
  name: string;
  role: string;
  status: string;
  zone: string | null;
};

type FleetVehicle = {
  id: string;
  registration: string;
  callSign: string;
  make: string;
  model: string;
  color: string | null;
  vehicleType: string;
  teamName?: string | null;
  status: string;
  crew: CrewMember[];
  crewCount: number;
  cameras?: CctvCamera[];
};

type TrackedVehicle = {
  id: string;
  registration: string;
  make: string;
  model: string;
  color?: string | null;
  owner?: string;
  trackerLinked?: boolean;
  theftRecovery?: boolean;
  immobiliserOn?: boolean;
  doorsLocked?: boolean;
  hornActive?: boolean;
  lat?: number | null;
  lng?: number | null;
  updatedAt?: string | null;
  status?: string;
  callSign?: string;
  speed?: number;
  batteryPct?: number | null;
  cameras?: CctvCamera[];
};

type Officer = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  zone: string | null;
};

type VehicleDraft = {
  callSign: string;
  registration: string;
  make: string;
  model: string;
  color: string;
  vehicleType: string;
  teamName: string;
};

type VehicleTab = 'commands' | 'tracking' | 'info' | 'history';

type Selection =
  | { kind: 'fleet'; id: string }
  | { kind: 'tracked'; id: string };

type ActivityEntry = {
  id: string;
  time: string;
  title: string;
  actor: string;
};

const EMPTY_DRAFT: VehicleDraft = {
  callSign: '',
  registration: '',
  make: '',
  model: '',
  color: '',
  vehicleType: 'ARMED_RESPONSE',
  teamName: 'Armed response',
};

function normReg(value: string) {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

function formatClock(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function relativeUpdated(iso?: string | null) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return hours === 1 ? '1h ago' : `${hours}h ago`;
}

function fleetStatusTone(status: string): 'ok' | 'info' | 'warn' | 'danger' | 'muted' {
  const s = status.toUpperCase();
  if (s === 'AVAILABLE' || s === 'ON_DUTY') return 'ok';
  if (s === 'EN_ROUTE') return 'info';
  if (s === 'MAINTENANCE' || s === 'RECOVERY') return 'warn';
  if (s === 'OFFLINE') return 'muted';
  return 'muted';
}

export default function FleetPage() {
  return (
    <ControlRoomLayout title="Vehicle Control">
      <FleetContent />
    </ControlRoomLayout>
  );
}

function FleetContent() {
  const { data: fleetData, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<FleetVehicle[]>>('/control-room/fleet'),
    [],
  );
  const { data: officersData } = useApi(
    () => adminApi.get<ApiResponse<Officer[]>>('/control-room/officers'),
    [],
  );
  const {
    data: trackedData,
    reload: reloadTracked,
  } = useApi(() => adminApi.get<ApiResponse<TrackedVehicle[]>>('/control-room/client-vehicles'), []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<{ officerId: string; role: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'ready' | 'maintenance'>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [dialog, setDialog] = useState<'add' | FleetVehicle | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tab, setTab] = useState<VehicleTab>('commands');
  const [busyAction, setBusyAction] = useState<VehicleRemoteAction | null>(null);
  const [remoteState, setRemoteState] = useState<VehicleRemoteState | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const fleet = fleetData?.data ?? [];
  const officers = officersData?.data ?? [];
  const tracked = trackedData?.data ?? [];

  const statusFiltered = useMemo(
    () =>
      fleet.filter((v) => {
        if (filter === 'active') return v.status === 'ON_DUTY';
        if (filter === 'ready') return ['AVAILABLE', 'ON_DUTY'].includes(v.status);
        if (filter === 'maintenance') return v.status === 'MAINTENANCE';
        return true;
      }),
    [fleet, filter],
  );

  const visibleFleet = useMemo(
    () =>
      statusFiltered.filter((v) =>
        matchesSearch(
          search,
          v.callSign,
          v.registration,
          v.make,
          v.model,
          v.color,
          v.vehicleType,
          v.teamName,
          v.status,
          ...v.crew.map((c) => c.name),
        ),
      ),
    [statusFiltered, search],
  );

  const visibleTracked = useMemo(
    () =>
      tracked.filter((v) =>
        matchesSearch(search, v.registration, v.make, v.model, v.owner, v.status, v.callSign),
      ),
    [tracked, search],
  );

  const selectedFleet =
    selection?.kind === 'fleet' ? fleet.find((v) => v.id === selection.id) ?? null : null;
  const selectedTracked =
    selection?.kind === 'tracked'
      ? tracked.find((v) => v.id === selection.id) ?? null
      : selectedFleet
        ? tracked.find((t) => normReg(t.registration) === normReg(selectedFleet.registration)) ?? null
        : null;

  useEffect(() => {
    if (selection) return;
    if (visibleFleet[0]) {
      setSelection({ kind: 'fleet', id: visibleFleet[0].id });
      return;
    }
    if (visibleTracked[0]) setSelection({ kind: 'tracked', id: visibleTracked[0].id });
  }, [selection, visibleFleet, visibleTracked]);

  useEffect(() => {
    if (!selectedTracked) {
      setRemoteState(null);
      return;
    }
    setRemoteState({
      doorsLocked: selectedTracked.doorsLocked ?? true,
      immobiliserOn: selectedTracked.immobiliserOn ?? false,
      theftRecovery: selectedTracked.theftRecovery ?? false,
      hornActive: selectedTracked.hornActive ?? false,
    });
  }, [
    selectedTracked?.id,
    selectedTracked?.doorsLocked,
    selectedTracked?.immobiliserOn,
    selectedTracked?.theftRecovery,
    selectedTracked?.hornActive,
  ]);

  function officerName(officerId: string) {
    const o = officers.find((x) => x.id === officerId);
    return o ? `${o.firstName} ${o.lastName}` : 'That officer';
  }

  function assignmentElsewhere(officerId: string, exceptVehicleId: string | null) {
    for (const vehicle of fleet) {
      if (vehicle.id === exceptVehicleId) continue;
      const seat = vehicle.crew.find((c) => c.officerId === officerId);
      if (seat) {
        return { callSign: vehicle.callSign, role: seat.role.replace(/_/g, ' ').toLowerCase() };
      }
    }
    return null;
  }

  function warn(text: string) {
    setNotice({ tone: 'warning', text });
  }

  function pushActivity(title: string, actor = 'Control room') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActivity((prev) => [{ id: `${Date.now()}-${title}`, time, title, actor }, ...prev].slice(0, 12));
  }

  function startEdit(vehicle: FleetVehicle) {
    setEditingId(vehicle.id);
    setEditingVehicle(vehicle);
    setSelectedCrew(vehicle.crew.map((c) => ({ officerId: c.officerId, role: c.role })));
    setNotice(null);
  }

  function addCrewSlot() {
    if (selectedCrew.length >= 4) return;
    const unassigned = officers.find(
      (o) =>
        !selectedCrew.some((c) => c.officerId === o.id) &&
        !assignmentElsewhere(o.id, editingId),
    );
    if (!unassigned) {
      warn('No free officers left. Unassign someone from another unit first.');
      return;
    }
    setSelectedCrew((prev) => [
      ...prev,
      { officerId: unassigned.id, role: prev.some((s) => s.role === 'DRIVER') ? 'PASSENGER' : 'DRIVER' },
    ]);
    setNotice(null);
  }

  function assignOfficer(idx: number, officerId: string) {
    const elsewhere = assignmentElsewhere(officerId, editingId);
    if (elsewhere) {
      warn(
        `${officerName(officerId)} is already ${elsewhere.role} on ${elsewhere.callSign}. Unassign them there first.`,
      );
      return;
    }
    if (selectedCrew.some((s, i) => i !== idx && s.officerId === officerId)) {
      warn(`${officerName(officerId)} is already in this crew.`);
      return;
    }
    setSelectedCrew((prev) => prev.map((s, i) => (i === idx ? { ...s, officerId } : s)));
    setNotice(null);
  }

  function assignRole(idx: number, role: string) {
    if (role === 'DRIVER' && selectedCrew.some((s, i) => i !== idx && s.role === 'DRIVER')) {
      warn('This unit already has a driver. Choose passenger or supervisor instead.');
      return;
    }
    setSelectedCrew((prev) => prev.map((s, i) => (i === idx ? { ...s, role } : s)));
    setNotice(null);
  }

  async function saveCrew(vehicleId: string) {
    setSaving(true);
    const clash = selectedCrew
      .map((s) => assignmentElsewhere(s.officerId, vehicleId))
      .find(Boolean);
    if (clash) {
      const seat = selectedCrew.find((s) => assignmentElsewhere(s.officerId, vehicleId));
      warn(
        `${seat ? officerName(seat.officerId) : 'An officer'} is already assigned to another unit.`,
      );
      setSaving(false);
      return;
    }
    if (new Set(selectedCrew.map((s) => s.officerId)).size !== selectedCrew.length) {
      warn('The same officer cannot hold two seats on this unit.');
      setSaving(false);
      return;
    }
    if (selectedCrew.length > 0 && selectedCrew.filter((s) => s.role === 'DRIVER').length !== 1) {
      warn('Each unit needs exactly one driver.');
      setSaving(false);
      return;
    }
    try {
      const res = await adminApi.patch<{ success?: boolean; message?: string }>(
        `/control-room/fleet/${vehicleId}/crew`,
        { crew: selectedCrew },
      );
      if (res && res.success === false) {
        throw new Error(res.message ?? 'Crew could not be saved');
      }
      setEditingId(null);
      setEditingVehicle(null);
      setNotice({ tone: 'success', text: 'Crew updated.' });
      pushActivity('Crew assignment updated', 'Control room');
      reload();
    } catch (ex) {
      setNotice({ tone: 'error', text: friendlyErrorMessage(ex, 'save') });
    } finally {
      setSaving(false);
    }
  }

  async function sendRemote(action: VehicleRemoteAction): Promise<boolean> {
    if (!selectedTracked) return false;
    setBusyAction(action);
    try {
      const res = await adminApi.post<
        ApiResponse<{
          message?: string;
          doorsLocked?: boolean;
          immobiliserOn?: boolean;
          theftRecovery?: boolean;
          hornActive?: boolean;
        }>
      >(`/control-room/client-vehicles/${selectedTracked.id}/remote`, { action });
      const data = res?.data;
      setRemoteState((prev) => ({
        doorsLocked:
          data?.doorsLocked ??
          (action === 'lock' ? true : action === 'unlock' ? false : prev?.doorsLocked ?? true),
        immobiliserOn:
          data?.immobiliserOn ??
          (action === 'immobilise' ? true : action === 'release' ? false : prev?.immobiliserOn ?? false),
        theftRecovery:
          data?.theftRecovery ??
          (action === 'panic' ? true : action === 'clearRecovery' ? false : prev?.theftRecovery ?? false),
        hornActive: data?.hornActive ?? (action === 'horn' ? !(prev?.hornActive ?? false) : prev?.hornActive),
      }));
      const actionLabel: Record<VehicleRemoteAction, string> = {
        lock: 'Doors locked',
        unlock: 'Doors unlocked',
        immobilise: 'Ignition disabled',
        release: 'Ignition released',
        horn: 'Horn / lights pulsed',
        panic: 'Vehicle panic / recovery',
        clearRecovery: 'Recovery cleared',
      };
      pushActivity(data?.message ?? actionLabel[action], 'Control room');
      setNotice({ tone: 'success', text: data?.message ?? 'Command sent.' });
      void reloadTracked({ silent: true });
      return true;
    } catch (ex) {
      setNotice({ tone: 'error', text: friendlyErrorMessage(ex, 'action') });
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading fleet..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const overviewTitle = selectedFleet?.callSign ?? selectedTracked?.registration ?? 'Select a unit';
  const overviewReg = selectedFleet?.registration ?? selectedTracked?.registration ?? '';
  const overviewMake = selectedFleet
    ? `${selectedFleet.make} ${selectedFleet.model}`
    : selectedTracked
      ? `${selectedTracked.make} ${selectedTracked.model}`
      : '';
  const overviewTeam = selectedFleet
    ? fleetTeamLabel(selectedFleet.vehicleType, selectedFleet.teamName)
    : 'Tracked client vehicle';
  const driver = selectedFleet?.crew.find((c) => c.role === 'DRIVER') ?? selectedFleet?.crew[0];
  const online =
    selectedTracked?.trackerLinked !== false &&
    (selectedFleet ? selectedFleet.status !== 'MAINTENANCE' : Boolean(selectedTracked));

  return (
    <div className="page-content ops-page">
      <header className="ops-page-header">
        <div>
          <h1 className="ops-page-header__title">Vehicle Control</h1>
          <p className="ops-page-header__subtitle">Remote commands &amp; vehicle management</p>
        </div>
        <div className="ops-page-header__actions">
          <button
            type="button"
            className={`btn-ghost ${filter === 'all' ? 'btn-ghost--active' : ''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            Show all
          </button>
          <button type="button" className="btn-ok" onClick={() => setDialog('add')}>
            + Add vehicle
          </button>
        </div>
      </header>

      {notice ? (
        <div className={`alert alert--${notice.tone === 'error' ? 'error' : notice.tone}`} role="status">
          {notice.text}
        </div>
      ) : null}

      <div className="ops-metrics" aria-label="Fleet summary">
        <article className="ops-metric">
          <strong className="ops-metric__value">{fleet.length}</strong>
          <span className="ops-metric__label">Total units</span>
        </article>
        <button
          type="button"
          className={`ops-metric ops-status--ok ${filter === 'active' ? 'ops-metric--active' : ''}`}
          onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
        >
          <strong className="ops-metric__value">{fleet.filter((v) => v.status === 'ON_DUTY').length}</strong>
          <span className="ops-metric__label">
            <span className="ops-status__dot" aria-hidden />
            Active
          </span>
        </button>
        <button
          type="button"
          className={`ops-metric ops-status--info ${filter === 'ready' ? 'ops-metric--active' : ''}`}
          onClick={() => setFilter(filter === 'ready' ? 'all' : 'ready')}
        >
          <strong className="ops-metric__value">
            {fleet.filter((v) => ['AVAILABLE', 'ON_DUTY'].includes(v.status)).length}
          </strong>
          <span className="ops-metric__label">
            <span className="ops-status__dot" aria-hidden />
            Dispatch ready
          </span>
        </button>
        <button
          type="button"
          className={`ops-metric ops-status--warn ${filter === 'maintenance' ? 'ops-metric--active' : ''}`}
          onClick={() => setFilter(filter === 'maintenance' ? 'all' : 'maintenance')}
        >
          <strong className="ops-metric__value">
            {fleet.filter((v) => v.status === 'MAINTENANCE').length}
          </strong>
          <span className="ops-metric__label">
            <span className="ops-status__dot" aria-hidden />
            Maintenance
          </span>
        </button>
      </div>

      <div className="ops-toolbar">
        <div className="list-search-bar">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search call sign, registration, crew…"
            resultCount={visibleFleet.length + visibleTracked.length}
            totalCount={fleet.length + tracked.length}
          />
        </div>
      </div>

      <div className="ops-vehicle-layout">
        <aside className="ops-vehicle-rail" aria-label="Vehicle list">
          <p className="ops-vehicle-rail__section">Company fleet</p>
          {visibleFleet.length === 0 ? (
            <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
              {search.trim() ? 'No fleet units match.' : 'No units in this filter.'}
            </p>
          ) : (
            visibleFleet.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`ops-vehicle-rail__item ${
                  selection?.kind === 'fleet' && selection.id === v.id ? 'ops-vehicle-rail__item--on' : ''
                }`}
                onClick={() => {
                  setSelection({ kind: 'fleet', id: v.id });
                  setTab('commands');
                }}
              >
                <strong>{v.callSign}</strong>
                <span>
                  {v.registration} · {v.make} {v.model}
                </span>
                <span>{v.status.replace(/_/g, ' ')} · {v.crewCount} crew</span>
              </button>
            ))
          )}

          {visibleTracked.length > 0 ? (
            <>
              <p className="ops-vehicle-rail__section">Tracked vehicles</p>
              {visibleTracked.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`ops-vehicle-rail__item ${
                    selection?.kind === 'tracked' && selection.id === v.id
                      ? 'ops-vehicle-rail__item--on'
                      : ''
                  }`}
                  onClick={() => {
                    setSelection({ kind: 'tracked', id: v.id });
                    setTab('commands');
                  }}
                >
                  <strong>{v.registration}</strong>
                  <span>
                    {v.make} {v.model}
                    {v.owner ? ` · ${v.owner}` : ''}
                  </span>
                  <span>{v.status?.replace(/_/g, ' ') ?? 'Tracked'}</span>
                </button>
              ))}
            </>
          ) : null}
        </aside>

        <div className="ops-vehicle-main">
          {!selectedFleet && !selectedTracked ? (
            <div className="ops-panel">
              <p className="text-muted" style={{ margin: 0 }}>
                Select a unit to open vehicle control.
              </p>
            </div>
          ) : (
            <>
              <section className="ops-vehicle-hero ops-vehicle-hero--viz">
                <div className="ops-vehicle-hero__visual">
                  {remoteState && selectedTracked ? (
                    <VehicleRemoteVisual
                      variant="full"
                      appearance="ops"
                      state={remoteState}
                      meta={{
                        title: overviewMake || overviewTitle,
                        registration: overviewReg,
                        online,
                        gpsLive: selectedTracked.lat != null && selectedTracked.lng != null,
                        speedKph: typeof selectedTracked.speed === 'number' ? selectedTracked.speed : null,
                        batteryPct: selectedTracked.batteryPct ?? null,
                        lastUpdate: relativeUpdated(selectedTracked?.updatedAt),
                      }}
                      model={{
                        make: selectedFleet?.make ?? selectedTracked.make,
                        model: selectedFleet?.model ?? selectedTracked.model,
                        colour: selectedFleet?.color ?? selectedTracked.color,
                      }}
                      busyAction={busyAction}
                      hidePanic={false}
                      onCommand={(action) => sendRemote(action)}
                    />
                  ) : (
                    <div className="text-muted" style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>
                      {selectedFleet
                        ? 'No linked tracker for remote visualization on this fleet unit.'
                        : 'Vehicle visualization unavailable.'}
                    </div>
                  )}
                </div>

                <div className="ops-vehicle-hero__meta">
                  <OpsStatusBadge
                    label={online ? 'ONLINE' : 'OFFLINE'}
                    tone={online ? 'ok' : 'muted'}
                  />
                  <h2 className="ops-vehicle-hero__title">{overviewTitle}</h2>
                  <p className="ops-vehicle-hero__sub">
                    {overviewReg}
                    {overviewMake ? ` · ${overviewMake}` : ''}
                    {overviewTeam ? ` · ${overviewTeam}` : ''}
                  </p>

                  <dl className="ops-vehicle-hero__facts">
                    <div>
                      <dt>Driver</dt>
                      <dd>{driver?.name ?? selectedTracked?.owner ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Zone</dt>
                      <dd>{driver?.zone ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>
                        {selectedTracked?.lat != null && selectedTracked?.lng != null ? (
                          <Link href={CONTROL_ROOM_ROUTES.map} className="link-sm">
                            {selectedTracked.lat.toFixed(5)}, {selectedTracked.lng.toFixed(5)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Last update</dt>
                      <dd>{relativeUpdated(selectedTracked?.updatedAt)}</dd>
                    </div>
                  </dl>

                  {selectedFleet ? (
                    <div className="ops-officer-card__actions" style={{ marginTop: '0.35rem' }}>
                      <button type="button" className="btn-sm btn-primary" onClick={() => startEdit(selectedFleet)}>
                        Edit crew
                      </button>
                      <button type="button" className="btn-sm btn-ghost" onClick={() => setDialog(selectedFleet)}>
                        Edit unit
                      </button>
                      <Link href={CONTROL_ROOM_ROUTES.map} className="btn-sm btn-secondary">
                        View on Map
                      </Link>
                    </div>
                  ) : null}

                  {activity.length > 0 ? (
                    <div className="ops-vehicle-hero__activity">
                      <p className="ops-vehicle-hero__activity-kicker">Activity</p>
                      <ul className="ops-activity ops-activity--compact">
                        {activity.slice(0, 5).map((row) => (
                          <li key={row.id}>
                            <time>{row.time}</time>
                            <span>{row.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>

              <div className="ops-tabs" role="tablist" aria-label="Vehicle control sections">
                {(
                  [
                    ['commands', 'Remote Commands'],
                    ['tracking', 'Live Tracking'],
                    ['info', 'Vehicle Info'],
                    ['history', 'History'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    className={`ops-tabs__btn ${tab === id ? 'ops-tabs__btn--on' : ''}`}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'commands' ? (
                <section className="ops-panel">
                  {selectedTracked && remoteState ? (
                    <VehicleRemotePad
                      variant="ops"
                      layout="command"
                      state={remoteState}
                      busyAction={busyAction}
                      vehicleLabel={overviewMake || overviewTitle}
                      registration={overviewReg}
                      onCommand={(action) => sendRemote(action)}
                    />
                  ) : (
                    <p className="text-muted" style={{ margin: 0 }}>
                      Remote commands require a linked tracked vehicle. Select a tracked unit, or match this
                      fleet registration to a client tracker.
                    </p>
                  )}
                </section>
              ) : null}

              {tab === 'tracking' ? (
                <section className="ops-panel">
                  <h3 className="ops-panel__title">Live tracking</h3>
                  {selectedTracked?.lat != null && selectedTracked?.lng != null ? (
                    <p style={{ margin: 0 }}>
                      GPS {selectedTracked.lat.toFixed(5)}, {selectedTracked.lng.toFixed(5)} · updated{' '}
                      {relativeUpdated(selectedTracked.updatedAt)} ({formatClock(selectedTracked.updatedAt)})
                    </p>
                  ) : (
                    <p className="text-muted" style={{ margin: 0 }}>
                      No live GPS fix available for this unit.
                    </p>
                  )}
                  <div style={{ marginTop: '0.75rem' }}>
                    <Link href={CONTROL_ROOM_ROUTES.map} className="btn-sm btn-secondary">
                      Open Live Map
                    </Link>
                  </div>
                  {(selectedFleet?.cameras?.length || selectedTracked?.cameras?.length) ? (
                    <div className="fleet-card__cams" style={{ marginTop: '1rem' }} aria-label="Vehicle cameras">
                      {(selectedFleet?.cameras ?? selectedTracked?.cameras ?? []).slice(0, 3).map((c) => (
                        <CctvLiveFeed key={c.id} camera={c} compact />
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {tab === 'info' ? (
                <section className="ops-panel">
                  <h3 className="ops-panel__title">Vehicle info</h3>
                  {selectedFleet ? (
                    <>
                      <dl className="ops-vehicle-hero__facts">
                        <div>
                          <dt>Call sign</dt>
                          <dd>{selectedFleet.callSign}</dd>
                        </div>
                        <div>
                          <dt>Registration</dt>
                          <dd>{selectedFleet.registration}</dd>
                        </div>
                        <div>
                          <dt>Type</dt>
                          <dd>{fleetTeamLabel(selectedFleet.vehicleType, selectedFleet.teamName)}</dd>
                        </div>
                        <div>
                          <dt>Duty</dt>
                          <dd>{fleetTeamDuty(selectedFleet.vehicleType)}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>
                            <OpsStatusBadge
                              label={selectedFleet.status.replace(/_/g, ' ')}
                              tone={fleetStatusTone(selectedFleet.status)}
                            />
                          </dd>
                        </div>
                        <div>
                          <dt>Colour</dt>
                          <dd>{selectedFleet.color || '—'}</dd>
                        </div>
                      </dl>
                      <div className="fleet-card__crew" style={{ marginTop: '1rem' }}>
                        <h4>Crew ({selectedFleet.crewCount})</h4>
                        {selectedFleet.crew.length === 0 ? (
                          <p className="text-muted">No officers assigned</p>
                        ) : (
                          <ul>
                            {selectedFleet.crew.map((c) => {
                              const clash = assignmentElsewhere(c.officerId, selectedFleet.id);
                              return (
                                <li key={c.officerId}>
                                  <strong>{c.name}</strong>
                                  <span>{c.role.replace(/_/g, ' ')}</span>
                                  <span className="text-muted">{officerStatusLabel(c.status)}</span>
                                  {clash ? (
                                    <span className="fleet-crew-clash">Also on {clash.callSign}</span>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </>
                  ) : selectedTracked ? (
                    <dl className="ops-vehicle-hero__facts">
                      <div>
                        <dt>Registration</dt>
                        <dd>{selectedTracked.registration}</dd>
                      </div>
                      <div>
                        <dt>Owner</dt>
                        <dd>{selectedTracked.owner ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Tracker</dt>
                        <dd>{selectedTracked.trackerLinked === false ? 'Not linked' : 'Linked'}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{selectedTracked.status?.replace(/_/g, ' ') ?? '—'}</dd>
                      </div>
                    </dl>
                  ) : null}
                </section>
              ) : null}

              {tab === 'history' ? (
                <section className="ops-panel">
                  <h3 className="ops-panel__title">Recent activity</h3>
                  {activity.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0 }}>
                      Commands and crew changes from this session appear here. No fabricated history.
                    </p>
                  ) : (
                    <ul className="ops-activity">
                      {activity.map((row) => (
                        <OpsActivityRow key={row.id} time={row.time} title={row.title} actor={row.actor} />
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              <p className="ops-safety-note">
                <strong>Safety first</strong>
                All remote commands are logged and monitored. Use remote controls responsibly and only when
                authorized.
              </p>
            </>
          )}
        </div>
      </div>

      {dialog ? (
        <VehicleDialog
          vehicle={dialog === 'add' ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={(text) => {
            setDialog(null);
            setNotice({ tone: 'success', text });
            pushActivity(text);
            reload();
          }}
        />
      ) : null}

      {editingId && editingVehicle ? (
        <OpsDialog
          title={`Edit crew — ${editingVehicle.callSign}`}
          subtitle="Assign officers and their roles for this unit. Each unit needs exactly one driver."
          onClose={() => {
            setEditingId(null);
            setEditingVehicle(null);
          }}
        >
          {notice ? (
            <div
              className={`alert alert--${notice.tone === 'error' ? 'error' : notice.tone}`}
              role="status"
              style={{ marginBottom: '0.75rem' }}
            >
              {notice.text}
            </div>
          ) : null}
          <div className="fleet-card__edit">
            {selectedCrew.map((slot, idx) => (
              <div key={idx} className="fleet-crew-row">
                <UiSelect
                  ariaLabel="Crew officer"
                  className="fleet-select fleet-select--officer"
                  value={slot.officerId}
                  onChange={(id) => assignOfficer(idx, id)}
                  options={officers.map((o) => {
                    const elsewhere = assignmentElsewhere(o.id, editingVehicle.id);
                    const onThisCrew = selectedCrew.some((s, i) => i !== idx && s.officerId === o.id);
                    const blocked = (Boolean(elsewhere) || onThisCrew) && o.id !== slot.officerId;
                    return {
                      value: o.id,
                      label: `${o.firstName} ${o.lastName}`,
                      meta: elsewhere
                        ? `On ${elsewhere.callSign}`
                        : onThisCrew
                          ? 'Already in this crew'
                          : undefined,
                      disabled: blocked,
                    };
                  })}
                />
                <UiSelect
                  ariaLabel="Crew role"
                  className="fleet-select fleet-select--role"
                  value={slot.role}
                  onChange={(role) => assignRole(idx, role)}
                  options={[
                    {
                      value: 'DRIVER',
                      label: 'Driver',
                      disabled:
                        slot.role !== 'DRIVER' && selectedCrew.some((s, i) => i !== idx && s.role === 'DRIVER'),
                      meta:
                        slot.role !== 'DRIVER' && selectedCrew.some((s, i) => i !== idx && s.role === 'DRIVER')
                          ? 'Taken'
                          : undefined,
                    },
                    { value: 'PASSENGER', label: 'Passenger' },
                    { value: 'SUPERVISOR', label: 'Supervisor' },
                  ]}
                />
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  onClick={() => setSelectedCrew((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="fleet-form__actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-ok btn-sm"
                onClick={addCrewSlot}
                disabled={selectedCrew.length >= 4}
              >
                Add officer
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setEditingId(null);
                  setEditingVehicle(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={saving}
                onClick={() => void saveCrew(editingVehicle.id)}
              >
                {saving ? 'Saving…' : 'Save crew'}
              </button>
            </div>
          </div>
        </OpsDialog>
      ) : null}
    </div>
  );
}

function VehicleDialog({
  vehicle,
  onClose,
  onSaved,
}: {
  vehicle: FleetVehicle | null;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const [draft, setDraft] = useState<VehicleDraft>(() =>
    vehicle
      ? {
          callSign: vehicle.callSign,
          registration: vehicle.registration,
          make: vehicle.make,
          model: vehicle.model,
          color: vehicle.color ?? '',
          vehicleType: vehicle.vehicleType,
          teamName: fleetTeamLabel(vehicle.vehicleType, vehicle.teamName),
        }
      : EMPTY_DRAFT,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setTeam(vehicleType: string) {
    const nextLabel = fleetTeamLabel(vehicleType);
    const previousLabel = fleetTeamLabel(draft.vehicleType);
    setDraft((prev) => ({
      ...prev,
      vehicleType,
      teamName: !prev.teamName.trim() || prev.teamName === previousLabel ? nextLabel : prev.teamName,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.callSign.trim() || !draft.registration.trim() || !draft.make.trim() || !draft.model.trim()) {
      setError('Call sign, registration, make, and model are required.');
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      callSign: draft.callSign.trim(),
      registration: draft.registration.trim(),
      make: draft.make.trim(),
      model: draft.model.trim(),
      color: draft.color.trim(),
      vehicleType: draft.vehicleType,
      teamName: draft.teamName.trim() || fleetTeamLabel(draft.vehicleType),
    };
    try {
      const res = vehicle
        ? await adminApi.patch<{ success?: boolean; message?: string }>(`/control-room/fleet/${vehicle.id}`, body)
        : await adminApi.post<{ success?: boolean; message?: string }>('/control-room/fleet', body);
      if (res && res.success === false) {
        throw new Error(res.message ?? 'Vehicle could not be saved');
      }
      onSaved(vehicle ? 'Unit updated.' : `${body.callSign} added to the fleet.`);
    } catch (ex) {
      setError(friendlyErrorMessage(ex, 'save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <OpsDialog
      title={vehicle ? `Edit ${vehicle.callSign}` : 'Add vehicle'}
      subtitle="Assign the operations team this unit works under — medic, response, patrol, and so on."
      onClose={onClose}
    >
      {error ? <ErrorAlert message={error} /> : null}
      <form className="fleet-form" onSubmit={(e) => void submit(e)}>
        <label>
          Call sign
          <input
            value={draft.callSign}
            onChange={(e) => setDraft({ ...draft, callSign: e.target.value })}
            placeholder="Unit 110"
            required
          />
        </label>
        <label>
          Registration
          <input
            value={draft.registration}
            onChange={(e) => setDraft({ ...draft, registration: e.target.value })}
            placeholder="ND 4DS-110"
            required
          />
        </label>
        <label>
          Make
          <input
            value={draft.make}
            onChange={(e) => setDraft({ ...draft, make: e.target.value })}
            placeholder="Toyota"
            required
          />
        </label>
        <label>
          Model
          <input
            value={draft.model}
            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            placeholder="Hilux"
            required
          />
        </label>
        <label>
          Colour
          <input
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            placeholder="White"
          />
        </label>
        <label>
          Operations team
          <UiSelect
            compact={false}
            ariaLabel="Operations team"
            value={draft.vehicleType}
            onChange={setTeam}
            options={FLEET_TEAMS.map((t) => ({ value: t.value, label: t.label, description: t.duty }))}
          />
        </label>
        <label className="fleet-form__full">
          Team name
          <input
            value={draft.teamName}
            onChange={(e) => setDraft({ ...draft, teamName: e.target.value })}
            placeholder={fleetTeamLabel(draft.vehicleType)}
          />
          <span className="text-muted">{fleetTeamDuty(draft.vehicleType)}</span>
        </label>
        <div className="fleet-form__actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-ok" disabled={saving}>
            {saving ? 'Saving…' : vehicle ? 'Save unit' : 'Add vehicle'}
          </button>
        </div>
      </form>
    </OpsDialog>
  );
}
