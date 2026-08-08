'use client';

import { useState, type FormEvent } from 'react';
import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi } from '@/lib/api-client';

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
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Commission failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading properties..." />;
  if (error || !data) return <ErrorAlert message={error ?? 'Failed to load'} onRetry={reload} />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Commission cameras</h1>
          <p className="text-muted">
            Link installed CCTV channels to a client property for portal and control-room viewing.
          </p>
        </div>
      </div>

      {msg && <div className="alert alert--success">{msg}</div>}
      {actionError && <ErrorAlert message={actionError} />}

      <form className="portal-card commission-form stack-form" onSubmit={commission}>
        <div className="form-field form-field--full">
          <span>Property</span>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
            <option value="">Select property…</option>
            {data.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.clientName} ({p.cameraCount} cams)
              </option>
            ))}
          </select>
        </div>

        <div className="commission-form__grid">
          <div className="form-field">
            <span>Camera name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Front gate"
              required
              autoComplete="off"
            />
          </div>
          <div className="form-field">
            <span>Location label</span>
            <input
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="Driveway entrance"
              required
              autoComplete="off"
            />
          </div>
          <div className="form-field">
            <span>Channel</span>
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              type="number"
              min={1}
              max={64}
              inputMode="numeric"
            />
          </div>
          <div className="form-field">
            <span>Placement</span>
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value as 'EXTERIOR' | 'INTERIOR')}
            >
              <option value="EXTERIOR">Exterior (always visible to staff)</option>
              <option value="INTERIOR">Interior (client privacy controls)</option>
            </select>
          </div>
        </div>

        <div className="commission-form__actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Commission camera'}
          </button>
        </div>
      </form>

      <section className="portal-card">
        <h2>Properties</h2>
        <ul className="status-list">
          {data.data.map((p) => (
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
      </section>
    </div>
  );
}
