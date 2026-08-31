'use client';

import Link from 'next/link';
import { CallActions } from '@/components/calls/CallActions';
import { IncidentDetailsMenu } from '@/components/control-room/IncidentDetailsMenu';
import { QuickDispatchPanel } from '@/components/control-room/QuickDispatchPanel';
import { isAwaitingDispatch } from '@/lib/incident-status';
import { VehicleRemotePad } from '@/components/vehicle/VehicleRemotePad';
import type { VehicleRemoteAction } from '@/lib/vehicle-remote';
import type { MapClient, MapFleetVehicle, MapIncident, MapOfficer, MapProperty, MapVehicle } from './map-types';
import { customerHref } from '@/lib/control-room-routes';
import { SubscriptionBadge } from '@/components/control-room/SubscriptionBadge';
import { fleetTeamLabel } from '@/lib/fleet-teams';

function formatTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClientPopup({ client }: { client: MapClient }) {
  return (
    <div className="map-popup-panel">
      <div className="map-popup-panel__header">
        <strong>{client.name}</strong>
        <span className="map-popup-tag map-popup-tag--user">{client.clientType.replace('_', ' ')}</span>
      </div>
      <dl className="map-popup-dl">
        <dt>Plan</dt>
        <dd>
          <SubscriptionBadge
            subscription={client.planName ? {
              planName: client.planName,
              tierCode: client.tierCode ?? 'ESSENTIAL',
              status: client.subscriptionStatus ?? 'ACTIVE',
            } : null}
            compact
          />
        </dd>
        <dt>Membership</dt>
        <dd>{client.membershipNumber ?? '—'}</dd>
        {client.validUntil && (
          <>
            <dt>Valid until</dt>
            <dd>{new Date(client.validUntil).toLocaleDateString()}</dd>
          </>
        )}
        <dt>Contact</dt>
        <dd>{client.phone ?? '—'}</dd>
        <dt>Emergency contacts</dt>
        <dd>
          {client.emergencyContacts.length
            ? client.emergencyContacts.map((c) => (
                <span key={c.phone} className="map-popup-contact">
                  {c.name} · {c.phone}
                </span>
              ))
            : '—'}
        </dd>
        <dt>Medical alerts</dt>
        <dd>{client.medicalAlerts ?? 'None recorded'}</dd>
        <dt>Status</dt>
        <dd>{client.status}</dd>
        <dt>Battery</dt>
        <dd>{client.batteryPct}%</dd>
        <dt>Last updated</dt>
        <dd>{formatTime(client.updatedAt)}</dd>
      </dl>
      <div className="map-popup-actions">
        <Link href={customerHref(client.id)} className="map-popup-link">Manage subscription</Link>
        <CallActions
          compact
          target={{
            name: client.name,
            phone: client.phone ?? undefined,
            userId: client.id,
            role: 'CLIENT',
          }}
        />
      </div>
    </div>
  );
}

function officerInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?';
}

export function OfficerPopup({ officer }: { officer: MapOfficer }) {
  return (
    <div className="map-popup-panel">
      <div className="map-popup-panel__header map-popup-panel__header--officer">
        {officer.avatarUrl ? (
          <img
            src={officer.avatarUrl}
            alt=""
            className="map-popup-avatar"
          />
        ) : (
          <div className="map-popup-avatar map-popup-avatar--initials">
            {officerInitials(officer.name)}
          </div>
        )}
        <div>
          <strong>{officer.name}</strong>
          <span className="map-popup-tag map-popup-tag--officer">{officer.officerType.replace('_', ' ')}</span>
        </div>
      </div>
      <dl className="map-popup-dl">
        <dt>Unit / vehicle</dt>
        <dd>
          {officer.vehicle
            ? `${officer.vehicle.callSign} · ${officer.vehicle.registration} (${officer.vehicle.role.replace('_', ' ')})`
            : officer.unitNumber}
        </dd>
        {officer.crewMates && officer.crewMates.length > 0 && (
          <>
            <dt>Riding with</dt>
            <dd>
              {officer.crewMates.map((m) => (
                <span key={m.officerId} className="map-popup-contact">
                  {m.name} · {m.role.replace('_', ' ')}
                </span>
              ))}
            </dd>
          </>
        )}
        <dt>Status</dt>
        <dd>{officer.status.replace('_', ' ')}</dd>
        <dt>Assignment</dt>
        <dd>{officer.assignment ?? 'Standby'}</dd>
        <dt>ETA</dt>
        <dd>{officer.eta ?? '—'}</dd>
        <dt>Zone</dt>
        <dd>{officer.zone ?? 'Unassigned'}</dd>
      </dl>
      <div className="map-popup-actions">
        <Link href="/control-room/officers" className="map-popup-link">Officer profile</Link>
        <CallActions
          compact
          target={{
            name: officer.name,
            phone: officer.phone ?? undefined,
            userId: officer.userId ?? undefined,
            role: 'OFFICER',
          }}
        />
      </div>
    </div>
  );
}

export function FleetVehiclePopup({ vehicle }: { vehicle: MapFleetVehicle }) {
  return (
    <div className="map-popup-panel map-popup-panel--fleet">
      <div className="map-popup-panel__header">
        <strong>{vehicle.callSign}</strong>
        <span className="map-popup-tag map-popup-tag--fleet">{fleetTeamLabel(vehicle.vehicleType, vehicle.teamName)}</span>
      </div>
      <dl className="map-popup-dl">
        <dt>Registration</dt>
        <dd>{vehicle.registration}</dd>
        <dt>Vehicle</dt>
        <dd>{vehicle.make} {vehicle.model}{vehicle.color ? ` · ${vehicle.color}` : ''}</dd>
        <dt>Status</dt>
        <dd>{vehicle.status.replace('_', ' ')}</dd>
        <dt>Tracker</dt>
        <dd>{vehicle.trackerStatus}</dd>
        <dt>Speed</dt>
        <dd>{vehicle.speed} km/h</dd>
        <dt>Crew ({vehicle.crewCount})</dt>
        <dd>
          {vehicle.crew.length === 0 ? (
            'Unassigned'
          ) : (
            vehicle.crew.map((c) => (
              <span key={c.officerId} className="map-popup-contact">
                {c.name} · {c.role.replace('_', ' ')}
                {c.status ? ` · ${c.status.replace('_', ' ')}` : ''}
              </span>
            ))
          )}
        </dd>
      </dl>
      <div className="map-popup-actions">
        <Link href="/control-room/fleet" className="map-popup-link">Manage fleet</Link>
      </div>
    </div>
  );
}

export function VehiclePopup({
  vehicle,
  onRemote,
}: {
  vehicle: MapVehicle;
  onRemote?: (action: VehicleRemoteAction) => void | Promise<void>;
}) {
  return (
    <div className="map-popup-panel">
      <div className="map-popup-panel__header">
        <strong>{vehicle.registration}</strong>
        <span className="map-popup-tag map-popup-tag--vehicle">{vehicle.vehicleType.replace('_', ' ')}</span>
      </div>
      <dl className="map-popup-dl">
        <dt>Make / Model</dt>
        <dd>{vehicle.make} {vehicle.model}</dd>
        <dt>Colour</dt>
        <dd>{vehicle.color ?? '—'}</dd>
        <dt>Owner</dt>
        <dd>{vehicle.owner}</dd>
        <dt>Tracker</dt>
        <dd>{vehicle.trackerStatus}</dd>
        <dt>Doors</dt>
        <dd>{vehicle.doorsLocked === false ? 'Unlocked' : 'Locked'}</dd>
        <dt>Immobiliser</dt>
        <dd>{vehicle.immobiliserOn ? 'Engaged' : 'Released'}</dd>
        <dt>Speed</dt>
        <dd>{vehicle.speed} km/h</dd>
        <dt>Last updated</dt>
        <dd>{formatTime(vehicle.updatedAt)}</dd>
      </dl>
      {onRemote ? (
        <VehicleRemotePad
          variant="ops"
          compact
          state={{
            doorsLocked: vehicle.doorsLocked ?? true,
            immobiliserOn: Boolean(vehicle.immobiliserOn),
            theftRecovery: Boolean(vehicle.theftRecovery || vehicle.vehicleType === 'STOLEN'),
          }}
          onCommand={onRemote}
        />
      ) : null}
    </div>
  );
}

export function PropertyPopup({ property }: { property: MapProperty }) {
  return (
    <div className="map-popup-panel">
      <div className="map-popup-panel__header">
        <strong>{property.name}</strong>
        <span className="map-popup-tag map-popup-tag--property">{property.propertyType.replace('_', ' ')}</span>
      </div>
      <dl className="map-popup-dl">
        <dt>Address</dt>
        <dd>{property.address}</dd>
        <dt>Owner</dt>
        <dd>{property.owner}</dd>
        <dt>Alarm</dt>
        <dd>{property.alarmStatus}</dd>
      </dl>
    </div>
  );
}

export function IncidentPopup({
  incident,
  onDispatchAssigned,
}: {
  incident: MapIncident;
  onDispatchAssigned?: () => void;
}) {
  const canQuickDispatch = isAwaitingDispatch(incident.status, incident.assignedOfficer);

  return (
    <div className="map-popup-panel map-popup-panel--incident">
      <div className="map-popup-panel__header">
        <strong>{incident.category.replace('_', ' ')}</strong>
        <span className={`map-popup-priority map-popup-priority--${incident.priority.toLowerCase()}`}>
          {incident.priority}
        </span>
      </div>
      <div className="map-popup-summary">
        <span className="map-popup-summary__name">{incident.name}</span>
        <span className="map-popup-summary__line">{incident.address ?? 'Unknown location'}</span>
        <span className="map-popup-summary__line">
          {incident.status.replace('_', ' ')}
          {' · '}
          {incident.assignedOfficer ?? 'Pending dispatch'}
          {incident.nearestUnitKm != null &&
            ` · ${incident.nearestUnitKm.toFixed(1)} km · ETA ${incident.nearestUnitEta ?? '—'}`}
        </span>
      </div>
      <QuickDispatchPanel
        incidentId={incident.id}
        compact
        hideContext
        defaultExpanded={canQuickDispatch}
        onAssigned={onDispatchAssigned}
        showDetailsLink={false}
      />
      <div className="map-popup-actions map-popup-actions--compact">
        <IncidentDetailsMenu incident={incident} triggerClassName="btn-sm" />
        <CallActions
          compact
          target={{
            name: incident.name,
            phone: incident.clientPhone ?? undefined,
            userId: incident.clientUserId,
            incidentId: incident.id,
            role: 'CLIENT',
          }}
        />
      </div>
    </div>
  );
}
