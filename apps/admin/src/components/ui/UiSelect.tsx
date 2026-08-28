'use client';

import { OpsMenuDropdown } from '@/components/ops/OpsMenuDropdown';

type UiSelectOption = {
  value: string;
  label: string;
  meta?: string;
  description?: string;
  disabled?: boolean;
};

type UiSelectProps = {
  value: string;
  options: UiSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  align?: 'left' | 'right';
};

export function UiSelect({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  className,
  compact = true,
  align = 'left',
}: UiSelectProps) {
  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <OpsMenuDropdown
      label={current || 'Select'}
      className={`ui-select ${compact ? '' : 'ui-select--field'} ${className ?? ''}`.trim()}
      compact={compact}
      align={align}
      ariaLabel={ariaLabel}
      disabled={disabled}
      items={options.map((o) => ({
        id: o.value,
        label: o.label,
        meta: o.meta,
        description: o.description,
        disabled: o.disabled,
        active: o.value === value,
        onClick: o.disabled ? undefined : () => onChange(o.value),
      }))}
    />
  );
}
