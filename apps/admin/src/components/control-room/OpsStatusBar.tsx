'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  cameraOnlineCount,
  isOpsVehicleScope,
  OPS_ALL_DASHCAMS_SCOPE,
  parseOpsVehicleScopeId,
  useOpsDesk,
} from '@/components/control-room/ops-desk';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { opsAlertKind } from '@/lib/ops-incident';

export function OpsStatusBar({ networkOnline }: { networkOnline: boolean }) {
  const desk = useOpsDesk();
  const [now, setNow] = useState('');

  useEffect(() => {
    const tick = () => setNow(formatClock(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const onVehicleScope = isOpsVehicleScope(desk.propertyId);
  const vehicleId = parseOpsVehicleScopeId(desk.propertyId);
  const dashcamVehicles =
    desk.propertyId === OPS_ALL_DASHCAMS_SCOPE || vehicleId === 'all'
      ? desk.vehicles.filter((vehicle) => (vehicle.cameras?.length ?? 0) > 0)
      : desk.vehicles.filter((vehicle) => vehicle.id === vehicleId);

  const scoped =
    desk.propertyId === 'all'
      ? desk.properties
      : desk.properties.filter((site) => site.id === desk.propertyId);
  const cameras = onVehicleScope
    ? dashcamVehicles.reduce((sum, vehicle) => sum + (vehicle.cameras?.length ?? 0), 0)
    : scoped.reduce((sum, site) => sum + site.cameraCount, 0);
  const online = onVehicleScope
    ? dashcamVehicles.reduce((sum, vehicle) => sum + cameraOnlineCount(vehicle.cameras), 0)
    : scoped.reduce((sum, site) => sum + site.onlineCameras, 0);
  const offline = Math.max(0, cameras - online);
  const armed = onVehicleScope
    ? 0
    : scoped.filter((site) => site.alarmStatus && site.alarmStatus !== 'DISARMED').length;
  const triggered = onVehicleScope
    ? 0
    : scoped.filter((site) => site.alarmStatus === 'TRIGGERED').length;
  const events = desk.stats?.activeIncidents ?? desk.incidents.length;
  const officers = desk.stats?.availableOfficers;
  const officerTotal = desk.stats?.totalOfficers;
  const panic = desk.incidents.filter(
    (incident) => opsAlertKind(incident.type) === 'panic' && isOpen(incident.status),
  ).length;

  return (
    <footer className="ops-status" aria-label="Operations status">
      <Link href={onVehicleScope ? CONTROL_ROOM_ROUTES.fleet : CONTROL_ROOM_ROUTES.surveillance}>
        {cameras} {onVehicleScope ? 'dashcams' : 'cameras'}
        {offline > 0 ? <em> · {offline} offline</em> : null}
      </Link>
      <Link href={CONTROL_ROOM_ROUTES.incidents}>{events} active events</Link>
      {panic > 0 ? (
        <Link href={CONTROL_ROOM_ROUTES.incidents} className="ops-status__alarm">
          {panic} panic
        </Link>
      ) : null}
      <Link href={CONTROL_ROOM_ROUTES.officers}>
        {officers == null ? 'Officers' : `${officers}/${officerTotal ?? officers} officers`}
      </Link>
      <Link href={CONTROL_ROOM_ROUTES.alarmSystems}>{armed} armed</Link>
      {triggered > 0 ? (
        <Link href={CONTROL_ROOM_ROUTES.alarmSystems} className="ops-status__alarm">
          {triggered} alarm
        </Link>
      ) : null}
      <span className="ops-status__grow" />
      <span className={desk.deskOnline ? 'ops-status__ok' : 'ops-status__bad'}>
        {desk.deskOnline ? 'System online' : 'System check'}
      </span>
      <span className={networkOnline ? 'ops-status__ok' : 'ops-status__bad'}>
        {networkOnline ? 'Network up' : 'Network down'}
      </span>
      <time dateTime={now}>{now}</time>
    </footer>
  );
}

function isOpen(status?: string) {
  const value = (status ?? '').toUpperCase();
  return value !== 'RESOLVED' && value !== 'CLOSED' && value !== 'CANCELLED';
}

function formatClock(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}
