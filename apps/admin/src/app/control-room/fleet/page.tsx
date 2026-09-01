'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { officerStatusLabel } from '@/lib/officer-status';
import { OpsKpi } from '@/components/ops/OpsKpi';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { UiSelect } from '@/components/ui/UiSelect';
import { ListSearch } from '@/components/ui/ListSearch';
import { LayoutViewToggle } from '@/components/ui/LayoutViewToggle';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { FLEET_TEAMS, fleetTeamDuty, fleetTeamLabel } from '@/lib/fleet-teams';
import { matchesSearch } from '@/lib/list-search';
import { useLayoutView } from '@/hooks/useLayoutView';

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

const EMPTY_DRAFT: VehicleDraft = {
  callSign: '',
  registration: '',
  make: '',
  model: '',
  color: '',
  vehicleType: 'ARMED_RESPONSE',
  teamName: 'Armed response',
};

export default function FleetPage() {
  return (
    <ControlRoomLayout title="Company Fleet">
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<{ officerId: string; role: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'ready' | 'maintenance'>('all');
  const [search, setSearch] = useState('');
  const [layoutView, setLayoutView] = useLayoutView('control-room-fleet');
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [dialog, setDialog] = useState<'add' | FleetVehicle | null>(null);

  const fleet = fleetData?.data ?? [];
  const officers = officersData?.data ?? [];
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

  function startEdit(vehicle: FleetVehicle) {
    setEditingId(vehicle.id);
    setEditingVehicle(vehicle);
    setSelectedCrew(
      vehicle.crew.map((c) => ({ officerId: c.officerId, role: c.role })),
    );
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
      reload();
    } catch (ex) {
      setNotice({ tone: 'error', text: friendlyErrorMessage(ex, 'save') });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading fleet..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <p className="text-muted">
            Vehicle-first board — active, dispatch, and maintenance.
          </p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className={`btn-ghost ${filter === 'all' ? 'btn-ghost--active' : ''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            Show all
          </button>
          <button type="button" className="btn-ok" onClick={() => setDialog('add')}>
            Add vehicle
          </button>
        </div>
      </header>

      {notice && (
        <div className={`alert alert--${notice.tone === 'error' ? 'error' : notice.tone}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="ops-board__kpi" style={{ marginBottom: '1rem' }}>
        <OpsKpi
          label="Active"
          value={fleet.filter((v) => v.status === 'ON_DUTY').length}
          active={filter === 'active'}
          onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
        />
        <OpsKpi
          label="Dispatch ready"
          value={fleet.filter((v) => ['AVAILABLE', 'ON_DUTY'].includes(v.status)).length}
          active={filter === 'ready'}
          onClick={() => setFilter(filter === 'ready' ? 'all' : 'ready')}
        />
        <OpsKpi
          label="Maintenance"
          value={fleet.filter((v) => v.status === 'MAINTENANCE').length}
          hot={fleet.some((v) => v.status === 'MAINTENANCE')}
          active={filter === 'maintenance'}
          onClick={() => setFilter(filter === 'maintenance' ? 'all' : 'maintenance')}
        />
      </div>

      <div className="list-toolbar">
        <div className="list-search-bar">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search call sign, registration, crew…"
            resultCount={visibleFleet.length}
            totalCount={statusFiltered.length}
          />
        </div>
        <LayoutViewToggle value={layoutView} onChange={setLayoutView} label="Fleet layout" />
      </div>

      {visibleFleet.length === 0 ? (
        <div className="empty-state">
          {search.trim()
            ? 'No units match this search.'
            : (
              <>
                No units in this filter.{' '}
                <button type="button" className="interactive-text" onClick={() => setFilter('all')}>
                  Show all
                </button>
              </>
            )}
        </div>
      ) : (
      <div className={`fleet-grid ${layoutView === 'list' ? 'fleet-grid--list' : ''}`}>
        {visibleFleet.map((v) => (
          <article key={v.id} className={`fleet-card fleet-card--${v.vehicleType.toLowerCase().replace(/_/g, '-')}`}>
            <div className="fleet-card__header">
              <div>
                <strong>{v.callSign}</strong>
                <span className="text-muted">{v.registration}</span>
              </div>
              <span className={`badge badge--fleet badge--fleet-${v.status.toLowerCase().replace(/_/g, '-')}`}>
                {v.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="fleet-card__vehicle">
              {v.make} {v.model}{v.color ? ` · ${v.color}` : ''}
            </p>
            <div className="fleet-card__team">
              <strong>{fleetTeamLabel(v.vehicleType, v.teamName)}</strong>
              <span>{fleetTeamDuty(v.vehicleType)}</span>
            </div>

            {v.cameras && v.cameras.length > 0 ? (
              <div className="fleet-card__cams" aria-label={`${v.callSign} dash cams`}>
                {v.cameras.slice(0, 3).map((c) => (
                  <CctvLiveFeed key={c.id} camera={c} compact />
                ))}
              </div>
            ) : null}

            <div className="fleet-card__crew">
              <h4>Crew ({v.crewCount})</h4>
              {v.crew.length === 0 ? (
                <p className="text-muted">No officers assigned</p>
              ) : (
                <ul>
                  {v.crew.map((c) => {
                    const clash = assignmentElsewhere(c.officerId, v.id);
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

            <div className="fleet-card__edit-actions">
              <button type="button" className="btn-primary btn-sm" onClick={() => startEdit(v)}>
                Edit crew
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setDialog(v)}>
                Edit unit
              </button>
            </div>
          </article>
        ))}
      </div>
      )}

      {dialog ? (
        <VehicleDialog
          vehicle={dialog === 'add' ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={(text) => {
            setDialog(null);
            setNotice({ tone: 'success', text });
            reload();
          }}
        />
      ) : null}

      {editingId && editingVehicle ? (
        <OpsDialog
          title={`Edit crew — ${editingVehicle.callSign}`}
          subtitle="Assign officers and their roles for this unit. Each unit needs exactly one driver."
          onClose={() => { setEditingId(null); setEditingVehicle(null); }}
        >
          {notice && (
            <div className={`alert alert--${notice.tone === 'error' ? 'error' : notice.tone}`} role="status" style={{ marginBottom: '0.75rem' }}>
              {notice.text}
            </div>
          )}
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
              <button type="button" className="btn-ok btn-sm" onClick={addCrewSlot} disabled={selectedCrew.length >= 4}>
                Add officer
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => { setEditingId(null); setEditingVehicle(null); }}>
                Cancel
              </button>
              <button type="button" className="btn-primary btn-sm" disabled={saving} onClick={() => void saveCrew(editingVehicle.id)}>
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
