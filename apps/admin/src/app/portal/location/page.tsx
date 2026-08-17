'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { clientApi } from '@/lib/api-client';

export default function LocationPage() {
  return (
    <PortalLayout>
      <LocationContent />
    </PortalLayout>
  );
}

function LocationContent() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');

  async function shareLocation() {
    setLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation not supported. Using demo coordinates.');
      const res = await clientApi.post<{ data: { lat: number; lng: number } }>('/client/tracking', {
        lat: -29.8587,
        lng: 31.0218,
      });
      setLocation(res.data);
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await clientApi.post<{ data: { lat: number; lng: number } }>('/client/tracking', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocation(res.data);
        setLoading(false);
      },
      async () => {
        const res = await clientApi.post<{ data: { lat: number; lng: number } }>('/client/tracking', {
          lat: -29.8587,
          lng: 31.0218,
        });
        setLocation(res.data);
        setError('Could not access GPS. Demo location saved.');
        setLoading(false);
      },
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Family Tracking</h1>
          <p className="text-muted">
            <Link href="/portal/family" className="interactive-text">Family safety</Link>
            {' · '}
            <Link href="/portal/safe-zones" className="interactive-text">Safe zones</Link>
          </p>
        </div>
      </div>
      <div className="feature-card">
        <p>Share your live GPS position with dispatch and family members.</p>
        <button type="button" className="btn-primary" onClick={shareLocation} disabled={loading}>
          {loading ? <LoadingSpinner label="" size="sm" /> : 'Update My Location'}
        </button>
        {error && <p className="alert alert--warning">{error}</p>}
        {location && (
          <div className="location-result">
            <strong>Location shared</strong>
            <span>Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</span>
          </div>
        )}
        <div className="map-placeholder map-placeholder--small map-placeholder--location">
          <div className="map-placeholder-grid" />
          {location ? <span className="location-pin" aria-hidden /> : null}
          <p>
            {location
              ? `Live · ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
              : 'Share your position with dispatch and family.'}
          </p>
        </div>
      </div>
    </div>
  );
}
