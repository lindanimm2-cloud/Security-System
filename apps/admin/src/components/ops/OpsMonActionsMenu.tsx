'use client';

import { OpsMenuDropdown, type OpsMenuItem } from '@/components/ops/OpsMenuDropdown';

export type OpsMonAction = OpsMenuItem;

type OpsMonActionsMenuProps = {
  label?: string;
  items: OpsMonAction[];
  align?: 'left' | 'right';
};

/** Circular ··· trigger used on ops-mon tables/cards — opens a portaled action menu. */
export function OpsMonActionsMenu({
  label = 'Actions',
  items,
  align = 'right',
}: OpsMonActionsMenuProps) {
  return (
    <OpsMenuDropdown
      label={<span aria-hidden>···</span>}
      ariaLabel={label}
      items={items}
      compact
      hideCaret
      align={align}
      className="ops-mon-actions"
      triggerClassName="ops-mon__more"
    />
  );
}
