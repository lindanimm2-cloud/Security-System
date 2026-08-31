'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FeatureHub } from '@/components/portal/FeatureHub';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { UpgradeBanner } from '@/components/portal/UpgradeBanner';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type Vehicle = {
  id: string;
  registration: string;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  trackerLinked: boolean;
  theftRecovery: boolean;
  immobiliserOn: boolean;
  insuranceInfo: string | null;
};

export default function VehiclesPage() {
  return (
    <PortalLayout>
      <VehiclesContent />
    </PortalLayout>
  );
}

function VehiclesContent() {
  const { access, loading: accessLoading } = useSubscriptionAccess();
  const { data, loading, error , reload } = useApi(
    () => clientApi.get<ApiResponse<Vehicle[]>>('/client/vehicles'),
    [],
  );

  if (loading || accessLoading) return <LoadingSpinner label="Loading vehicles..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  const vehicles = data!.data;
  const hasVehicle = access?.vehicle ?? false;

  return (
    <FeatureHub
      title="Vehicle Security"
      subtitle="Registration, tracking, theft recovery, and driver monitoring."
      features={[
        { title: 'Vehicle Registration', description: 'Register all vehicles linked to your account.', status: hasVehicle ? `${vehicles.length} registered` : undefined, href: '/portal/vehicles#vehicles-list', action: 'View vehicles', price: 'R 500/mo', requiresAccess: 'vehicle', requiresAddon: 'VEHICLE_RESPONSE' },
        { title: 'Live Tracking', description: 'View vehicle locations in real time when tracking is active.', status: 'Per vehicle', href: '/portal/vehicles#vehicles-list', action: 'Open vehicle profile', price: 'R 500/mo', requiresAccess: 'vehicle', requiresAddon: 'VEHICLE_RESPONSE' },
        { title: 'Remote lock & immobiliser', description: 'Lock doors, pulse horn, or cut the starter from your phone.', status: 'Ready', href: '/portal/vehicles#vehicles-list', action: 'Open vehicle remote', price: 'R 500/mo', requiresAccess: 'vehicle', requiresAddon: 'VEHICLE_RESPONSE' },
        { title: 'Geofencing', description: 'Alerts when vehicles enter or exit zones.', status: 'Active', href: '/portal/safe-zones', action: 'Manage zones', price: 'R 500/mo', requiresAccess: 'vehicle', requiresAddon: 'VEHICLE_RESPONSE' },
        { title: 'Roadside Assistance', description: 'Request breakdown and roadside assistance.', href: '/portal/requests/roadside', action: 'Request roadside help', requiresAccess: 'vehicle', requiresAddon: 'VEHICLE_RESPONSE', price: 'R 500/mo' },
        { title: 'Report an alert', description: 'Report accidents, theft, or anything that needs a response.', href: '/portal/theft', action: 'Report what happened', requiresAccess: 'vehicle', requiresAddon: 'VEHICLE_RESPONSE', price: 'R 500/mo' },
      ]}
      access={access}
      accessKey="vehicle"
    >
      {!hasVehicle && <UpgradeBanner addon="VEHICLE_RESPONSE" title="Vehicle Response" price="R 500" />}
      {hasVehicle && (
        <div id="vehicles-list" className="entity-grid">
          {vehicles.map((v) => (
            <Link key={v.id} href={`/portal/vehicles/${v.id}`} className="entity-card entity-card--link">
              <p className="ec-kicker">Vehicle</p>
              <div className="entity-card-header">
                <span className="entity-card-title">{v.registration}</span>
                <span className={`status-pill ${v.theftRecovery ? 'status-pill--alert' : 'status-pill--ok'}`}>
                  {v.theftRecovery ? 'Recovery active' : 'Secure'}
                </span>
              </div>
              <p>{v.year} {v.make} {v.model}</p>
              <p className="text-muted">
                {v.immobiliserOn ? 'Immobiliser on' : v.theftRecovery ? 'Recovery active' : 'Remote lock ready'}
                {v.insuranceInfo ? ` · ${v.insuranceInfo}` : ''}
              </p>
              <span className="feature-action">Open vehicle profile</span>
            </Link>
          ))}
        </div>
      )}
    </FeatureHub>
  );
}
