/** South African panel / zone helpers for portal + control room UI */

export type ArmMode = 'ARMED' | 'STAY' | 'NIGHT' | 'DISARMED';

export type ArmModeOption = {
  value: ArmMode;
  label: string;
  hint: string;
  /** SVG path(s) rendered as the button icon */
  icon: string;
  /** CSS modifier class that drives per-mode colour */
  colorKey: string;
};

export const ARM_MODE_OPTIONS: ArmModeOption[] = [
  {
    value: 'ARMED',
    label: 'Away',
    hint: 'Full arm — all zones active',
    colorKey: 'away',
    // House with arrow leaving — filled shield outline with exit arrow
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
      d="M3 12l2-2m0 0l7-7 7 7m-2 0v8a1 1 0 01-1 1H9a1 1 0 01-1-1v-4H8v4"/>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
      d="M15 19h3m0 0l-2-2m2 2l-2 2"/>`,
  },
  {
    value: 'STAY',
    label: 'Stay',
    hint: 'Perimeter only — interior free',
    colorKey: 'stay',
    // Shield with inner ring (perimeter concept)
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>`,
  },
  {
    value: 'NIGHT',
    label: 'Night',
    hint: 'Night arm — beams + perimeter',
    colorKey: 'night',
    // Crescent moon
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>`,
  },
  {
    value: 'DISARMED',
    label: 'Disarm',
    hint: 'System off — all zones clear',
    colorKey: 'disarm',
    // Open lock
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
      d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>`,
  },
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
    DOOR: 'Door',
    WINDOW: 'Window',
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
  const map: Record<string, string> = {
    SECURE: 'Secure',
    NORMAL: 'Secure',
    ALERT: 'Alert',
    OPEN: 'Open',
    FAULT: 'Fault',
    TAMPER: 'Tamper',
    BYPASSED: 'Bypassed',
    OFFLINE: 'Offline',
  };
  return map[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

export function sensorStatusTone(status: string, bypassed?: boolean): string {
  if (bypassed) return 'pending';
  const key = status.toUpperCase();
  if (key === 'SECURE' || key === 'NORMAL') return 'ok';
  if (key === 'ALERT' || key === 'OPEN' || key === 'TAMPER') return 'alert';
  if (key === 'FAULT' || key === 'OFFLINE') return 'pending';
  return status.toLowerCase();
}
