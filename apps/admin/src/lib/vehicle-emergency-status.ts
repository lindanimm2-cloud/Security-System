export const VEHICLE_EMERGENCY_STATUSES = [
  {
    value: 'STOLEN',
    label: 'Stolen',
    short: 'STOLEN',
    badge: 'Stolen',
    recoveryLine: 'Recovery · tap to exit',
    notifyTitle: 'Vehicle reported stolen',
    notifyBody: 'Theft recovery active — response team tracking this vehicle.',
  },
  {
    value: 'HIJACKING',
    label: 'Hijacking in progress',
    short: 'HIJACKING',
    badge: 'Hijacking',
    recoveryLine: 'Hijack recovery · tap to exit',
    notifyTitle: 'Hijacking in progress',
    notifyBody: 'Active hijacking — treat as life-safety. Live track and response engaged.',
  },
  {
    value: 'ACCIDENT',
    label: 'Car accident',
    short: 'ACCIDENT',
    badge: 'Accident',
    recoveryLine: 'Accident response · tap to exit',
    notifyTitle: 'Vehicle accident reported',
    notifyBody: 'Accident status set — keep responders and family informed of updates.',
  },
  {
    value: 'ROBBERY',
    label: 'Robbery / smash & grab',
    short: 'ROBBERY',
    badge: 'Robbery',
    recoveryLine: 'Robbery response · tap to exit',
    notifyTitle: 'Vehicle robbery reported',
    notifyBody: 'Robbery / smash & grab — recovery and evidence capture active.',
  },
  {
    value: 'BREAK_IN',
    label: 'Break-in',
    short: 'BREAK-IN',
    badge: 'Break-in',
    recoveryLine: 'Break-in response · tap to exit',
    notifyTitle: 'Vehicle break-in reported',
    notifyBody: 'Break-in status set — monitoring and recovery workflow active.',
  },
  {
    value: 'MISSING',
    label: 'Missing / not returned',
    short: 'MISSING',
    badge: 'Missing',
    recoveryLine: 'Missing vehicle · tap to exit',
    notifyTitle: 'Vehicle reported missing',
    notifyBody: 'Vehicle not returned — search and recovery tracking active.',
  },
  {
    value: 'SUSPICIOUS',
    label: 'Suspicious activity',
    short: 'SUSPICIOUS',
    badge: 'Suspicious',
    recoveryLine: 'Watch mode · tap to exit',
    notifyTitle: 'Suspicious vehicle activity',
    notifyBody: 'Suspicious activity flagged — operators will update as the situation develops.',
  },
  {
    value: 'MEDICAL',
    label: 'Medical emergency',
    short: 'MEDICAL',
    badge: 'Medical',
    recoveryLine: 'Medical response · tap to exit',
    notifyTitle: 'Medical emergency involving vehicle',
    notifyBody: 'Medical emergency linked to this vehicle — coordinate with response units.',
  },
] as const;

export type VehicleEmergencyStatus = (typeof VEHICLE_EMERGENCY_STATUSES)[number]['value'];

export function isVehicleEmergencyStatus(value: unknown): value is VehicleEmergencyStatus {
  return (
    typeof value === 'string' &&
    VEHICLE_EMERGENCY_STATUSES.some((s) => s.value === value)
  );
}

export function vehicleEmergencyMeta(status: string | null | undefined) {
  const key = String(status ?? '')
    .trim()
    .toUpperCase();
  return (
    VEHICLE_EMERGENCY_STATUSES.find((s) => s.value === key) ??
    VEHICLE_EMERGENCY_STATUSES[0]
  );
}

/** Map / ops class: any active emergency recovery still routes as STOLEN trail. */
export function vehicleTypeForEmergency(
  theftRecovery: boolean,
  emergencyStatus?: string | null,
): 'STOLEN' | 'CLIENT' {
  if (theftRecovery || emergencyStatus) return 'STOLEN';
  return 'CLIENT';
}
