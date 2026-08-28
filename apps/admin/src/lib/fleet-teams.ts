export const FLEET_TEAMS = [
  { value: 'ARMED_RESPONSE', label: 'Armed response', duty: 'Tactical armed reaction' },
  { value: 'MEDICAL', label: 'Medical', duty: 'Ambulance and medic support' },
  { value: 'PATROL', label: 'Patrol', duty: 'Visible patrol and deterrence' },
  { value: 'FIRE_TRUCK', label: 'Fire', duty: 'Fire and rescue support' },
  { value: 'TACTICAL', label: 'Tactical', duty: 'High-risk intervention' },
  { value: 'MOTORCYCLE', label: 'Rapid response', duty: 'Motorcycle interceptor' },
  { value: 'UNMARKED', label: 'Unmarked', duty: 'Covert observation' },
] as const;

export type FleetTeamValue = (typeof FLEET_TEAMS)[number]['value'];

export function fleetTeamLabel(type: string, teamName?: string | null) {
  const named = teamName?.trim();
  if (named) return named;
  return FLEET_TEAMS.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

export function fleetTeamDuty(type: string) {
  return FLEET_TEAMS.find((t) => t.value === type)?.duty ?? 'Operational unit';
}
