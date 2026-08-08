'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { officerStatusLabel } from '@/lib/officer-status';
import { friendlyErrorMessage } from '@/lib/friendly-error';

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
  status: string;
  crew: CrewMember[];
  crewCount: number;
};

type Officer = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  zone: string | null;
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
  const [selectedCrew, setSelectedCrew] = useState<{ officerId: string; role: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fleet = fleetData?.data ?? [];
  const officers = officersData?.data ?? [];

  function startEdit(vehicle: FleetVehicle) {
    setEditingId(vehicle.id);
    setSelectedCrew(
      vehicle.crew.map((c) => ({ officerId: c.officerId, role: c.role })),
    );
    setMsg('');
  }

  function addCrewSlot() {
    if (selectedCrew.length >= 4) return;
    const unassigned = officers.find((o) => !selectedCrew.some((c) => c.officerId === o.id));
    if (!unassigned) return;
    setSelectedCrew((prev) => [
      ...prev,
      { officerId: unassigned.id, role: prev.length === 0 ? 'DRIVER' : 'PASSENGER' },
    ]);
  }

  async function saveCrew(vehicleId: string) {
    setSaving(true);
    setMsg('');
    try {
      await adminApi.patch(`/control-room/fleet/${vehicleId}/crew`, { crew: selectedCrew });
      setEditingId(null);
      setMsg('Crew updated.');
      reload();
    } catch (ex) {
      setMsg(friendlyErrorMessage(ex, 'save'));
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
          <h2>Company fleet</h2>
          <p className="text-muted">
            Assign 1–4 officers per vehicle — driver plus passengers or supervisor. Officers can ride solo or as a pair.
          </p>
        </div>
      </header>

      {msg && <div className="alert alert--success">{msg}</div>}

      <div className="fleet-grid">
        {fleet.map((v) => (
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
            <p className="fleet-card__type">{v.vehicleType.replace(/_/g, ' ')}</p>

            <div className="fleet-card__crew">
              <h4>Crew ({v.crewCount})</h4>
              {v.crew.length === 0 ? (
                <p className="text-muted">No officers assigned</p>
              ) : (
                <ul>
                  {v.crew.map((c) => (
                    <li key={c.officerId}>
                      <strong>{c.name}</strong>
                      <span>{c.role.replace(/_/g, ' ')}</span>
                      <span className="text-muted">{officerStatusLabel(c.status)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {editingId === v.id ? (
              <div className="fleet-card__edit">
                {selectedCrew.map((slot, idx) => (
                  <div key={idx} className="fleet-crew-row">
                    <select
                      value={slot.officerId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedCrew((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, officerId: id } : s)),
                        );
                      }}
                    >
                      {officers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.firstName} {o.lastName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={slot.role}
                      onChange={(e) => {
                        const role = e.target.value;
                        setSelectedCrew((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, role } : s)),
                        );
                      }}
                    >
                      <option value="DRIVER">Driver</option>
                      <option value="PASSENGER">Passenger</option>
                      <option value="SUPERVISOR">Supervisor</option>
                    </select>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setSelectedCrew((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="fleet-card__edit-actions">
                  <button type="button" className="btn-secondary btn-sm" onClick={addCrewSlot} disabled={selectedCrew.length >= 4}>
                    Add officer
                  </button>
                  <button type="button" className="btn-primary btn-sm" disabled={saving} onClick={() => void saveCrew(v.id)}>
                    {saving ? 'Saving…' : 'Save crew'}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn-secondary btn-sm" onClick={() => startEdit(v)}>
                Edit crew
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
