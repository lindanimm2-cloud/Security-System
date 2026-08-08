'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type SafeZone = { id: string; name: string; lat: string; lng: string; radiusM: number };

export default function SafeZonesPage() {
  return (
    <PortalLayout>
      <SafeZonesContent />
    </PortalLayout>
  );
}

function SafeZonesContent() {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<SafeZone[]>>('/client/safe-zones'),
    [],
  );

  async function createZone() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await clientApi.post('/client/safe-zones', {
        name: name.trim(),
        lat: -29.8587,
        lng: 31.0218,
        radiusM: 500,
      });
      setName('');
      reload();
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading safe zones..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const zones = data!.data;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Safe Zones</h1>
          <p className="text-muted">Designated safe areas — get notified when family enters or leaves.</p>
        </div>
      </div>

      <div className="portal-card">
        <h2>Your Safe Zones</h2>
        {zones.length === 0 ? (
          <p className="text-muted">No safe zones configured yet.</p>
        ) : (
          <ul className="status-list">
            {zones.map((z) => (
              <li key={z.id} className="status-list-item">
                <Link href="/portal/location" className="status-list-link">{z.name}</Link>
                <Link href="/portal/location" className="text-muted interactive-text">{z.radiusM}m radius</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="portal-card">
        <h2>Add Safe Zone</h2>
        <div className="inline-form">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone name (e.g. School)" />
          <button type="button" className="btn-primary" onClick={createZone} disabled={creating}>
            {creating ? <LoadingSpinner label="" size="sm" /> : 'Add Zone'}
          </button>
        </div>
        <p className="text-muted">New zones use your current location. Edit coordinates in the mobile app.</p>
      </div>

      <div className="feature-grid">
        <Link href="/portal/family" className="feature-card">
          <h3>Child Protection</h3>
          <p>Monitoring and emergency features designed for children within safe zones.</p>
          <span className="feature-action">Family safety →</span>
        </Link>
        <Link href="/portal/family" className="feature-card">
          <h3>Elderly Monitoring</h3>
          <p>Enhanced welfare features for elderly family members leaving safe areas.</p>
          <span className="feature-action">Family safety →</span>
        </Link>
      </div>
    </div>
  );
}
