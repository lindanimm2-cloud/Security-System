'use client';

import { OpsMenuDropdown, type OpsMenuItem } from '@/components/ops/OpsMenuDropdown';

type UiSelectOption = {
  value: string;
  label: string;
  meta?: string;
  description?: string;
  disabled?: boolean;
  group?: string;
  tone?: 'default' | 'danger' | 'ok';
};

type UiSelectProps = {
  value: string;
  options: UiSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  compact?: boolean;
  align?: 'left' | 'right';
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

export function UiSelect({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  className,
  panelClassName,
  compact = true,
  align = 'left',
  placeholder = 'Select',
  searchable,
  searchPlaceholder,
}: UiSelectProps) {
  const current = options.find((o) => o.value === value)?.label ?? (value || placeholder);
  const items: OpsMenuItem[] = [];
  let lastGroup: string | undefined;

  for (const option of options) {
    if (option.group && option.group !== lastGroup) {
      items.push({
        id: `__group:${option.group}`,
        label: option.group,
        heading: true,
      });
      lastGroup = option.group;
    }
    items.push({
      id: option.value || `__empty:${option.label}`,
      label: option.label,
      meta: option.meta,
      description: option.description,
      disabled: option.disabled,
      tone: option.tone,
      active: option.value === value,
      onClick: option.disabled ? undefined : () => onChange(option.value),
    });
  }

  return (
    <OpsMenuDropdown
      label={current || placeholder}
      className={`ui-select ${compact ? '' : 'ui-select--field'} ${className ?? ''}`.trim()}
      panelClassName={panelClassName}
      compact={compact}
      align={align}
      ariaLabel={ariaLabel}
      disabled={disabled}
      searchable={searchable ?? options.length >= 12}
      searchPlaceholder={searchPlaceholder}
      items={items}
    />
  );
}
