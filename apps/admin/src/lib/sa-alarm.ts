/** South African panel / zone helpers for portal + control room UI */

export type ArmMode = 'ARMED' | 'STAY' | 'NIGHT' | 'DISARMED';

export const ARM_MODE_OPTIONS: { value: ArmMode; label: string; hint: string }[] = [
  { value: 'ARMED', label: 'Away', hint: 'Full arm — all zones' },
  { value: 'STAY', label: 'Stay', hint: 'Perimeter only (SA stay arm)' },
  { value: 'NIGHT', label: 'Night', hint: 'Night arm — beams + perimeter' },
  { value: 'DISARMED', label: 'Disarm', hint: 'System off' },
];

export function isArmedStatus(status: string): boolean {
  return ['ARMED', 'STAY', 'NIGHT', 'EXIT_DELAY', 'ENTRY_DELAY', 'TRIGGERED'].includes(status);
}

export function alarmStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ARMED: 'Away armed',
    STAY: 'Stay armed',
    NIGHT: 'Night armed',
    DISARMED: 'Disarmed',
    TRIGGERED: 'Alarm triggered',
    OFFLINE: 'Panel offline',
    EXIT_DELAY: 'Exit delay',
    ENTRY_DELAY: 'Entry delay',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function sensorTypeLabel(type: string): string {
  const map: Record<string, string> = {
    PIR: 'PIR motion',
    DOOR_CONTACT: 'Door contact',
    WINDOW_CONTACT: 'Window contact',
    GLASS_BREAK: 'Glass break',
    SMOKE: 'Smoke detector',
    HEAT: 'Heat detector',
    GAS: 'Gas detector',
    WATER_LEAK: 'Water leak',
    PANIC_BUTTON: 'Panic button',
    MEDICAL_BUTTON: 'Medical button',
    FIRE_BUTTON: 'Fire button',
    OUTDOOR_BEAM: 'Outdoor beam',
    ELECTRIC_FENCE: 'Electric fence',
    VIBRATION: 'Vibration / shock',
    KEYPAD: 'Keypad',
    SIREN: 'Siren',
    OTHER: 'Sensor',
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

export function sensorStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase();
}
