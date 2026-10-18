'use client';

import { createContext, useContext } from 'react';
import type { CctvCamera } from '@/components/portal/CctvLiveFeed';
import type { ArcDeskEvent, ArcOperatorResponse } from '@/lib/arc-desk';
import type { OpsIncident } from '@/lib/ops-incident';

export type OpsSiteEvent = {
  id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  triggeredAt: string;
  requiresAck?: boolean;
  claimedByUserId?: string | null;
  claimedByName?: string | null;
  zoneNumber?: number | null;
  requiredAction?: string | null;
  reportAsType?: string | null;
  responses?: ArcDeskEvent['responses'];
};

export type OpsSite = {
  id: string;
  name: string;
  alarmStatus: string;
  cameraCount: number;
  onlineCameras: number;
  cameras?: CctvCamera[];
  openEvents?: OpsSiteEvent[];
};

export type OpsOfficer = {
  id: string;
  name: string;
  status: string;
  zone?: string;
};

export type OpsVehicleHit = {
  id: string;
  callSign: string;
  registration: string;
  cameras?: CctvCamera[];
};

/** Property picker / wall scope for a fleet vehicle's dash cams. */
export function opsVehicleScopeId(vehicleId: string) {
  return `vehicle:${vehicleId}`;
}

export const OPS_ALL_DASHCAMS_SCOPE = 'vehicle:all';

export function parseOpsVehicleScopeId(scopeId: string): string | null {
  if (!scopeId.startsWith('vehicle:')) return null;
  return scopeId.slice('vehicle:'.length) || null;
}

export function isOpsVehicleScope(scopeId: string) {
  return scopeId.startsWith('vehicle:');
}

export function cameraOnlineCount(cameras?: { status?: string }[]) {
  if (!cameras?.length) return 0;
  return cameras.filter((camera) => {
    const status = (camera.status ?? '').toUpperCase();
    return !['OFFLINE', 'FAULT', 'DISABLED', 'NO_SIGNAL'].includes(status);
  }).length;
}

export type OpsDeskStats = {
  cameras: number;
  offlineCameras: number;
  activeIncidents: number;
  criticalIncidents: number;
  availableOfficers: number;
  totalOfficers: number;
};

export type OpsDeskValue = {
  role: string;
  operatorId?: string;
  operatorName?: string;
  query: string;
  setQuery: (value: string) => void;
  propertyId: string;
  setPropertyId: (id: string) => void;
  properties: OpsSite[];
  incidents: OpsIncident[];
  deskEvents: ArcDeskEvent[];
  setDeskEvents: (events: ArcDeskEvent[] | ((prev: ArcDeskEvent[]) => ArcDeskEvent[])) => void;
  operatorResponses: ArcOperatorResponse[];
  officers: OpsOfficer[];
  vehicles: OpsVehicleHit[];
  stats: OpsDeskStats | null;
  surveillanceLoading: boolean;
  surveillanceError: string | null;
  deskOnline: boolean;
  reload: () => void;
};

const OpsDeskContext = createContext<OpsDeskValue | null>(null);

export function OpsDeskProvider({ value, children }: { value: OpsDeskValue; children: React.ReactNode }) {
  return <OpsDeskContext.Provider value={value}>{children}</OpsDeskContext.Provider>;
}

export function useOpsDesk(): OpsDeskValue {
  const value = useContext(OpsDeskContext);
  if (!value) {
    throw new Error('Operations wall is only available inside the control room.');
  }
  return value;
}
