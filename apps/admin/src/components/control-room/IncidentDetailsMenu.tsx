'use client';

import { OpsMenuDropdown, type OpsMenuItem } from '@/components/ops/OpsMenuDropdown';
import {
  CONTROL_ROOM_ROUTES,
  customerHref,
  documentsHref,
  incidentHref,
} from '@/lib/control-room-routes';

export type IncidentDetailsTarget = {
  id: string;
  name?: string;
  address?: string | null;
  clientUserId?: string;
  clientPhone?: string | null;
  lat?: number;
  lng?: number;
};

function mapsUrl(target: IncidentDetailsTarget) {
  if (target.lat != null && target.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}`;
  }
  if (target.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.address)}`;
  }
  return CONTROL_ROOM_ROUTES.map;
}

function whatsappUrl(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

export function IncidentDetailsMenu({
  incident,
  onFocusMap,
  triggerClassName = 'btn-sm',
  compact = true,
}: {
  incident: IncidentDetailsTarget;
  onFocusMap?: () => void;
  triggerClassName?: string;
  compact?: boolean;
}) {
  const phone = incident.clientPhone?.trim() || '';
  const items: OpsMenuItem[] = [
    onFocusMap
      ? {
          id: 'focus',
          label: 'Focus on map',
          description: incident.address || 'Centre the live map on this alert',
          onClick: onFocusMap,
        }
      : {
          id: 'map',
          label: 'Open live map',
          description: incident.address || 'Show this alert on the command map',
          href: `${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`,
        },
    {
      id: 'file',
      label: 'Incident file',
      description: 'Timeline, reports and status',
      href: incidentHref(incident.id),
    },
  ];

  if (phone) {
    items.push(
      {
        id: 'call',
        label: 'Call client',
        description: phone,
        href: `tel:${phone}`,
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        href: whatsappUrl(phone),
      },
    );
  }

  items.push(
    {
      id: 'customer',
      label: 'Customer record',
      href: customerHref(incident.clientUserId),
    },
    {
      id: 'cctv',
      label: 'Nearby CCTV',
      href: CONTROL_ROOM_ROUTES.surveillance,
    },
    {
      id: 'docs',
      label: 'Documents',
      href: documentsHref({ incidentId: incident.id }),
    },
    {
      id: 'nav',
      label: 'Open navigation',
      description: incident.address ?? undefined,
      href: mapsUrl(incident),
    },
  );

  return (
    <OpsMenuDropdown
      label="Details"
      ariaLabel={`Details for ${incident.name ?? 'incident'}`}
      items={items}
      compact={compact}
      hideCaret
      align="right"
      className="ops-menu--action"
      triggerClassName={triggerClassName}
    />
  );
}
