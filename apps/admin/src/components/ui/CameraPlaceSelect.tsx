'use client';

import { useEffect, useMemo, useState } from 'react';
import { UiSelect } from '@/components/ui/UiSelect';

export type CameraPlacement = 'EXTERIOR' | 'INTERIOR';

export type CameraPlacePreset = {
  value: string;
  label: string;
  placement: CameraPlacement;
  group: 'Exterior' | 'Interior';
  meta?: string;
};

export const CAMERA_PLACE_PRESETS: CameraPlacePreset[] = [
  { value: 'Front gate', label: 'Front gate', placement: 'EXTERIOR', group: 'Exterior', meta: 'Main entrance' },
  { value: 'Back gate', label: 'Back gate', placement: 'EXTERIOR', group: 'Exterior', meta: 'Rear access' },
  { value: 'Side entrance', label: 'Side entrance', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Driveway', label: 'Driveway', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Parking', label: 'Parking', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Garage', label: 'Garage', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Patio / garden', label: 'Patio / garden', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Perimeter wall', label: 'Perimeter wall', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Roof / eaves', label: 'Roof / eaves', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Shop front', label: 'Shop front', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Loading bay', label: 'Loading bay', placement: 'EXTERIOR', group: 'Exterior' },
  { value: 'Reception', label: 'Reception', placement: 'INTERIOR', group: 'Interior' },
  { value: 'Lounge / living', label: 'Lounge / living', placement: 'INTERIOR', group: 'Interior' },
  { value: 'Hallway', label: 'Hallway', placement: 'INTERIOR', group: 'Interior' },
  { value: 'Kitchen', label: 'Kitchen', placement: 'INTERIOR', group: 'Interior' },
  { value: 'Office', label: 'Office', placement: 'INTERIOR', group: 'Interior' },
  { value: 'Till / POS', label: 'Till / POS', placement: 'INTERIOR', group: 'Interior' },
  { value: 'Stock room', label: 'Stock room', placement: 'INTERIOR', group: 'Interior' },
  { value: 'Warehouse aisle', label: 'Warehouse aisle', placement: 'INTERIOR', group: 'Interior' },
  { value: 'Server room', label: 'Server room', placement: 'INTERIOR', group: 'Interior' },
];

const CUSTOM_VALUE = '__custom__';

function matchPreset(locationLabel: string): CameraPlacePreset | null {
  const normalized = locationLabel.trim().toLowerCase();
  if (!normalized) return null;
  return (
    CAMERA_PLACE_PRESETS.find((p) => p.value.toLowerCase() === normalized) ??
    CAMERA_PLACE_PRESETS.find((p) => p.label.toLowerCase() === normalized) ??
    null
  );
}

type CameraPlaceSelectProps = {
  value: string;
  onChange: (next: { locationLabel: string; placement?: CameraPlacement }) => void;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  allowEmpty?: boolean;
  placeholder?: string;
};

/** Place picker with exterior/interior presets + custom location. */
export function CameraPlaceSelect({
  value,
  onChange,
  ariaLabel = 'Camera place',
  className = '',
  compact = true,
  allowEmpty = false,
  placeholder = 'Select place',
}: CameraPlaceSelectProps) {
  const matched = matchPreset(value);
  const [forceCustom, setForceCustom] = useState(() => Boolean(value.trim()) && !matchPreset(value));
  const isCustom = forceCustom || (Boolean(value.trim()) && !matched);
  const selectValue = isCustom ? CUSTOM_VALUE : matched?.value ?? '';

  useEffect(() => {
    if (matched) setForceCustom(false);
  }, [matched]);

  const options = useMemo(() => {
    return [
      ...(allowEmpty ? [{ value: '', label: placeholder, group: 'Places' }] : []),
      ...CAMERA_PLACE_PRESETS.map((p) => ({
        value: p.value,
        label: p.label,
        meta: p.meta,
        group: p.group,
      })),
      {
        value: CUSTOM_VALUE,
        label: 'Custom place…',
        meta: 'Type your own',
        group: 'Custom',
      },
    ];
  }, [allowEmpty, placeholder]);

  function handleSelect(next: string) {
    if (next === CUSTOM_VALUE) {
      setForceCustom(true);
      if (matched || !value.trim()) {
        onChange({ locationLabel: '' });
      }
      return;
    }
    setForceCustom(false);
    if (!next) {
      onChange({ locationLabel: '' });
      return;
    }
    const preset = CAMERA_PLACE_PRESETS.find((p) => p.value === next);
    onChange({
      locationLabel: next,
      placement: preset?.placement,
    });
  }

  return (
    <div className={`camera-place-select ${className}`.trim()}>
      <UiSelect
        value={selectValue}
        onChange={handleSelect}
        options={options}
        ariaLabel={ariaLabel}
        compact={compact}
        searchable
        searchPlaceholder="Search places…"
        placeholder={placeholder}
        className="camera-place-select__menu"
      />
      {isCustom ? (
        <input
          className="camera-place-select__custom"
          value={matched ? '' : value}
          onChange={(e) => onChange({ locationLabel: e.target.value })}
          placeholder="e.g. Pool pump house, Unit B alley…"
          aria-label="Custom place name"
          autoComplete="off"
        />
      ) : null}
    </div>
  );
}

type CameraZoneSelectProps = {
  value: CameraPlacement;
  onChange: (value: CameraPlacement) => void;
  ariaLabel?: string;
  compact?: boolean;
  className?: string;
};

/** Exterior / Interior zone with clearer labels. */
export function CameraZoneSelect({
  value,
  onChange,
  ariaLabel = 'Camera zone',
  compact = true,
  className = '',
}: CameraZoneSelectProps) {
  return (
    <UiSelect
      value={value}
      onChange={(v) => onChange(v as CameraPlacement)}
      ariaLabel={ariaLabel}
      compact={compact}
      className={`camera-zone-select ${className}`.trim()}
      options={[
        { value: 'EXTERIOR', label: 'Exterior', meta: 'Outside · staff visible', group: 'Zone' },
        { value: 'INTERIOR', label: 'Interior', meta: 'Inside · privacy controls', group: 'Zone' },
      ]}
    />
  );
}
