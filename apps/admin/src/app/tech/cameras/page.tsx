'use client';

import { useState, type FormEvent } from 'react';
import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi } from '@/lib/api-client';
import { UiSelect } from '@/components/ui/UiSelect';
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

export default function TechCamerasPage() {
  return (
    <TechLayout title="Commission cameras">
      <TechCamerasContent />
    </TechLayout>
  );
}

function TechCamerasContent() {
  const { data, loading, error, reload } = useApi(
    () => techApi.get<{ success: boolean; data: PropertyRow[] }>('/store/tech/properties'),
    [],
  );
  const [propertyId, setPropertyId] = useState('');
  const [name, setName] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [channel, setChannel] = useState('1');
  const [placement, setPlacement] = useState<'EXTERIOR' | 'INTERIOR'>('EXTERIOR');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [commissionOpen, setCommissionOpen] = useState(false);

  function openCommissionForm(propertyId = '') {
    setPropertyId(propertyId);
    setName('');
    setLocationLabel('');
    setChannel('1');
    setPlacement('EXTERIOR');
    setActionError('');
    setCommissionOpen(true);
  }

  function closeCommissionForm() {
    setCommissionOpen(false);
    setActionError('');
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
            vendor: '4DS Nexus',
          },
        ],
      });
      setMsg(
        placement === 'INTERIOR'
          ? 'Interior camera commissioned (private to staff until client shares or panic/alarm).'
          : 'Camera commissioned and linked for monitoring.',
      );
      setName('');
      setLocationLabel('');
      setPlacement('EXTERIOR');
      closeCommissionForm();
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Commission failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading properties..." />;
  if (error || !data) return <ErrorAlert message={error ?? 'Failed to load'} onRetry={reload} />;

  const properties = Array.isArray(data.data) ? data.data : [];
  const filteredProperties = properties.filter((p) =>
    matchesSearch(search, p.name, p.address, p.clientName, p.cameraCount, p.camerasLinked),
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Commission cameras</h1>
          <p className="text-muted">
            Link installed CCTV channels to a client property for portal and control-room viewing.
          </p>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={() => openCommissionForm()}>
          + Commission camera
        </button>
      </div>

      {msg && <div className="alert alert--success">{msg}</div>}
      {actionError && <ErrorAlert message={actionError} />}

      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search properties, client, address…"
          resultCount={filteredProperties.length}
          totalCount={properties.length}
        />
      </div>

      {commissionOpen && (
        <OpsDialog
          title="Commission camera"
          subtitle="Link an installed CCTV channel to a client property."
          onClose={closeCommissionForm}
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
                onChange={setPropertyId}
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
                Location label
                <input
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="Driveway entrance"
                  required
                  autoComplete="off"
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
                Placement
                <UiSelect
                  compact={false}
                  ariaLabel="Camera placement"
                  value={placement}
                  onChange={(value) => setPlacement(value as 'EXTERIOR' | 'INTERIOR')}
                  options={[
                    { value: 'EXTERIOR', label: 'Exterior', meta: 'Always visible to staff' },
                    { value: 'INTERIOR', label: 'Interior', meta: 'Client privacy controls' },
                  ]}
                />
              </label>
            </div>
            <div className="fleet-form__actions">
              <button type="button" className="btn-ghost" onClick={closeCommissionForm}>
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
                <span className="badge">{p.cameraCount} linked</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
