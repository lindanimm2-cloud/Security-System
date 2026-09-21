'use client';

import {
  VEHICLE_EMERGENCY_STATUSES,
  vehicleEmergencyMeta,
  type VehicleEmergencyStatus,
} from '@/lib/vehicle-emergency-status';

type Props = {
  status: string | null | undefined;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  onChange: (status: VehicleEmergencyStatus) => void | Promise<void>;
};

export function VehicleEmergencyStatusPicker({
  status,
  disabled,
  busy,
  compact,
  onChange,
}: Props) {
  const current = vehicleEmergencyMeta(status).value;

  return (
    <div
      className={`vehicle-emergency-status ${compact ? 'vehicle-emergency-status--compact' : ''}`}
      role="group"
      aria-label="Vehicle emergency status"
    >
      <p className="vehicle-emergency-status__label">Situation</p>
      <div className="vehicle-emergency-status__chips">
        {VEHICLE_EMERGENCY_STATUSES.map((opt) => {
          const active = opt.value === current;
          return (
            <button
              key={opt.value}
              type="button"
              className={`vehicle-emergency-status__chip ${active ? 'is-active' : ''}`}
              disabled={disabled || busy || active}
              title={opt.label}
              aria-pressed={active}
              onClick={() => void onChange(opt.value)}
            >
              {opt.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
