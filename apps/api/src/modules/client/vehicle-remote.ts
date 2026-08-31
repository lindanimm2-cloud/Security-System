export const VEHICLE_REMOTE_ACTIONS = [
  'lock',
  'unlock',
  'immobilise',
  'release',
  'horn',
  'panic',
] as const;

export type VehicleRemoteAction = (typeof VEHICLE_REMOTE_ACTIONS)[number];

export function isVehicleRemoteAction(value: unknown): value is VehicleRemoteAction {
  return typeof value === 'string' && (VEHICLE_REMOTE_ACTIONS as readonly string[]).includes(value);
}

export function clientVehicleDashCams(vehicle: {
  id: string;
  registration: string;
  trackerLinked?: boolean;
}) {
  const live = vehicle.trackerLinked !== false;
  const status = live ? 'RECORDING' : 'OFFLINE';
  return [
    {
      id: `${vehicle.id}-cam-front`,
      name: 'Dash forward',
      locationLabel: `${vehicle.registration} · windscreen`,
      channel: 1,
      status,
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: false,
    },
    {
      id: `${vehicle.id}-cam-cabin`,
      name: 'Cabin',
      locationLabel: `${vehicle.registration} · cabin`,
      channel: 2,
      status: live ? 'ONLINE' : 'OFFLINE',
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: true,
    },
    {
      id: `${vehicle.id}-cam-rear`,
      name: 'Rear view',
      locationLabel: `${vehicle.registration} · rear`,
      channel: 3,
      status: live ? 'ONLINE' : 'OFFLINE',
      snapshotUrl: null as string | null,
      isLiveCapable: live,
      isInterior: false,
    },
  ];
}
