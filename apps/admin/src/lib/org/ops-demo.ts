import { DEMO_ORG_ID, DEMO_SITES, listGates, listIncidents, listPeople, listSites } from './demo-data';
import type {
  OrgActivityEvent,
  OrgAttentionItem,
  OrgCamera,
  OrgMapMarker,
  OrgSearchHit,
  OrgSite,
} from './types';

const GATEWAY = DEMO_SITES.gateway;
const WAREHOUSE = DEMO_SITES.warehouse;

const SCENE_BY_GROUP: Record<OrgCamera['group'], NonNullable<OrgCamera['scene']>> = {
  entrances: 'entrance',
  retail: 'atrium',
  parking: 'parking',
  loading: 'loading',
  perimeter: 'perimeter',
  critical: 'lobby',
  offices: 'lobby',
};

/** Demo catalogue only. These are not connected camera devices. */
const DEMO_CAMERAS: OrgCamera[] = [
  {
    id: 'cam-01',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    siteName: 'Gateway Mall',
    name: 'CAM 01 · Main entrance',
    location: 'North entrance canopy',
    group: 'entrances',
    status: 'ONLINE',
    quality: 'excellent',
    ptz: true,
    audio: true,
    scene: 'entrance',
    demo: true,
  },
  {
    id: 'cam-02',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    siteName: 'Gateway Mall',
    name: 'CAM 02 · Retail atrium',
    location: 'Building A · Level 1',
    group: 'retail',
    status: 'ONLINE',
    quality: 'good',
    ptz: false,
    audio: true,
    scene: 'atrium',
    demo: true,
  },
  {
    id: 'cam-03',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    siteName: 'Gateway Mall',
    name: 'CAM 03 · Parking B',
    location: 'Parking Level B',
    group: 'parking',
    status: 'ONLINE',
    quality: 'good',
    ptz: true,
    audio: false,
    scene: 'parking',
    demo: true,
  },
  {
    id: 'cam-04',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    siteName: 'Gateway Mall',
    name: 'CAM 04 · Loading bay',
    location: 'Loading zone · Gate 02',
    group: 'loading',
    status: 'OFFLINE',
    quality: 'none',
    ptz: false,
    audio: false,
    offlineFor: '4 min',
    scene: 'loading',
    demo: true,
  },
  {
    id: 'cam-05',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    siteName: 'Gateway Mall',
    name: 'CAM 05 · Perimeter east',
    location: 'Perimeter fence · East',
    group: 'perimeter',
    status: 'ONLINE',
    quality: 'good',
    ptz: true,
    audio: false,
    scene: 'perimeter',
    demo: true,
  },
  {
    id: 'cam-06',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    siteName: 'Gateway Mall',
    name: 'CAM 06 · Control lobby',
    location: 'Security lobby',
    group: 'critical',
    status: 'DEGRADED',
    quality: 'poor',
    ptz: false,
    audio: true,
    scene: 'lobby',
    demo: true,
  },
  {
    id: 'cam-07',
    organizationId: DEMO_ORG_ID,
    siteId: WAREHOUSE,
    siteName: 'Durban Warehouse',
    name: 'CAM 07 · Yard gate',
    location: 'Gate 3',
    group: 'entrances',
    status: 'ONLINE',
    quality: 'good',
    ptz: true,
    audio: false,
    scene: 'yard',
    demo: true,
  },
  {
    id: 'cam-08',
    organizationId: DEMO_ORG_ID,
    siteId: WAREHOUSE,
    siteName: 'Durban Warehouse',
    name: 'CAM 08 · Dock 2',
    location: 'Loading dock 2',
    group: 'loading',
    status: 'OFFLINE',
    quality: 'none',
    ptz: false,
    audio: false,
    offlineFor: '11 min',
    scene: 'dock',
    demo: true,
  },
];

const DEMO_ACTIVITY: OrgActivityEvent[] = [
  {
    id: 'act-1',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    time: '14:42',
    text: 'Officer checked Gate 02',
    location: 'Loading zone',
  },
  {
    id: 'act-2',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    time: '14:37',
    text: 'Visitor checked in',
    location: 'North entrance',
  },
  {
    id: 'act-3',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    time: '14:31',
    text: 'Motion on CAM 08 zone',
    location: 'Loading zone',
  },
  {
    id: 'act-4',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    time: '14:22',
    text: 'Vehicle entered main gate',
    location: 'Gate 01',
  },
  {
    id: 'act-5',
    organizationId: DEMO_ORG_ID,
    siteId: GATEWAY,
    time: '14:11',
    text: 'Fire panel zone 3 cleared',
    location: 'Building A plant room',
  },
  {
    id: 'act-6',
    organizationId: DEMO_ORG_ID,
    siteId: WAREHOUSE,
    time: '13:58',
    text: 'Perimeter beam restored',
    location: 'South fence',
  },
];

/** Richer site systems so the strip shows real counts in demo. */
const DEMO_MARKERS: OrgMapMarker[] = [
  { id: 'm-cam1', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'camera', label: 'CAM 01', x: 22, y: 28, tone: 'ok', cameraId: 'cam-01' },
  { id: 'm-cam2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'camera', label: 'CAM 02', x: 44, y: 32, tone: 'ok', cameraId: 'cam-02' },
  { id: 'm-cam3', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'camera', label: 'CAM 03', x: 70, y: 50, tone: 'ok', cameraId: 'cam-03' },
  { id: 'm-cam4', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'camera', label: 'CAM 04', x: 68, y: 62, tone: 'danger', cameraId: 'cam-04' },
  { id: 'm-cam5', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'camera', label: 'CAM 05', x: 86, y: 40, tone: 'ok', cameraId: 'cam-05' },
  { id: 'm-gate', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'gate', label: 'Gate 01', x: 18, y: 48, tone: 'warn' },
  { id: 'm-gate2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'gate', label: 'Gate 02', x: 72, y: 70, tone: 'ok' },
  { id: 'm-off', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'officer', label: 'Post A', x: 40, y: 36, tone: 'ok' },
  { id: 'm-off2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'officer', label: 'Post B', x: 58, y: 52, tone: 'ok' },
  { id: 'm-bldg', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'building', label: 'Building A', x: 48, y: 42, tone: 'info' },
  { id: 'm-veh', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'vehicle', label: 'Yard', x: 74, y: 30, tone: 'info' },
  { id: 'm-inc', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'incident', label: 'Panic', x: 56, y: 24, tone: 'danger' },
  { id: 'm-fire', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'fire', label: 'Fire panel A', x: 34, y: 58, tone: 'warn' },
  { id: 'm-fire2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'fire', label: 'Fire panel B', x: 52, y: 20, tone: 'ok' },
  { id: 'm-asm', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'assembly', label: 'Assembly N', x: 82, y: 18, tone: 'ok' },
  { id: 'm-asm2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'assembly', label: 'Assembly S', x: 78, y: 78, tone: 'ok' },
  { id: 'm-hose', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'hose', label: 'Hose reel 1', x: 30, y: 72, tone: 'info' },
  { id: 'm-hose2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'hose', label: 'Hose reel 2', x: 62, y: 44, tone: 'info' },
  { id: 'm-hose3', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'hose', label: 'Hose reel 3', x: 20, y: 60, tone: 'ok' },
  { id: 'm-wire', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'wiring', label: 'Fence E', x: 12, y: 70, tone: 'ok' },
  { id: 'm-wire2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'wiring', label: 'Fence W', x: 8, y: 40, tone: 'ok' },
  { id: 'm-sens', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'sensor', label: 'PIR 12', x: 60, y: 78, tone: 'warn' },
  { id: 'm-sens2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'sensor', label: 'PIR 08', x: 36, y: 30, tone: 'ok' },
  { id: 'm-sens3', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'sensor', label: 'Beam 03', x: 88, y: 58, tone: 'ok' },
  { id: 'm-sens4', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'sensor', label: 'Door contact', x: 26, y: 44, tone: 'ok' },
  { id: 'm-sens5', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'sensor', label: 'Smoke 2', x: 46, y: 56, tone: 'ok' },
  { id: 'm-zone', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'zone', label: 'Zone 3', x: 50, y: 64, tone: 'info' },
  { id: 'm-zone2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'zone', label: 'Zone 1', x: 32, y: 38, tone: 'ok' },
  { id: 'm-zone3', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'zone', label: 'Zone 2', x: 64, y: 36, tone: 'ok' },
  { id: 'm-ent', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'entrance', label: 'North door', x: 26, y: 18, tone: 'ok' },
  { id: 'm-ent2', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'entrance', label: 'Staff door', x: 42, y: 70, tone: 'ok' },
  { id: 'm-ent3', organizationId: DEMO_ORG_ID, siteId: GATEWAY, kind: 'entrance', label: 'Fire exit', x: 14, y: 24, tone: 'ok' },
];

function virtualSite(organizationId: string): OrgSite {
  return {
    id: `${organizationId}-demo-site`,
    organizationId,
    name: 'Primary site',
    address: 'Demo site',
    siteType: 'Site',
    status: 'NORMAL',
    peopleOnSite: 64,
    vehiclesOnSite: 18,
    visitorsOnSite: 6,
    officersOnDuty: 2,
    officersRostered: 3,
    camerasOnline: 7,
    camerasTotal: 8,
    openGates: 1,
    activeAlerts: 1,
  };
}

function resolveSites(organizationId: string): OrgSite[] {
  const sites = listSites(organizationId);
  return sites.length ? sites : [virtualSite(organizationId)];
}

function remapCameras(organizationId: string): OrgCamera[] {
  if (organizationId === DEMO_ORG_ID) return DEMO_CAMERAS;
  const sites = resolveSites(organizationId);
  const primary = sites[0]!;
  // Put the full demo catalogue on the primary site so every org sees live previews.
  return DEMO_CAMERAS.map((camera) => ({
    ...camera,
    id: `${organizationId}:${camera.id}`,
    organizationId,
    siteId: primary.id,
    siteName: primary.name,
    scene: camera.scene ?? SCENE_BY_GROUP[camera.group],
  }));
}

function remapMarkers(organizationId: string): OrgMapMarker[] {
  if (organizationId === DEMO_ORG_ID) return DEMO_MARKERS;
  const sites = resolveSites(organizationId);
  const primary = sites[0]!;
  return DEMO_MARKERS.filter((m) => m.siteId === GATEWAY).map((marker) => ({
    ...marker,
    id: `${organizationId}:${marker.id}`,
    organizationId,
    siteId: primary.id,
    cameraId: marker.cameraId ? `${organizationId}:${marker.cameraId}` : undefined,
  }));
}

function remapActivity(organizationId: string): OrgActivityEvent[] {
  if (organizationId === DEMO_ORG_ID) return DEMO_ACTIVITY;
  const sites = resolveSites(organizationId);
  const primary = sites[0]!;
  return DEMO_ACTIVITY.map((event) => ({
    ...event,
    id: `${organizationId}:${event.id}`,
    organizationId,
    siteId: primary.id,
  }));
}

function inScope<T extends { organizationId: string; siteId: string }>(
  rows: T[],
  organizationId: string,
  siteId: string | 'all',
) {
  const scope = !siteId || siteId === 'all' ? 'all' : siteId;
  const matched = rows.filter(
    (row) => row.organizationId === organizationId && (scope === 'all' || row.siteId === scope),
  );
  if (matched.length || scope === 'all') return matched;
  // Selected site has no demo rows yet — project primary-site demo assets onto it.
  return rows
    .filter((row) => row.organizationId === organizationId)
    .map((row) => ({ ...row, siteId: scope }));
}

export function listOrgCameras(organizationId: string, siteId: string | 'all' = 'all'): OrgCamera[] {
  return inScope(remapCameras(organizationId), organizationId, siteId);
}

export function getOrgCamera(organizationId: string, cameraId: string): OrgCamera | null {
  return remapCameras(organizationId).find((c) => c.id === cameraId) ?? null;
}

export function listOrgActivity(
  organizationId: string,
  siteId: string | 'all' = 'all',
): OrgActivityEvent[] {
  return inScope(remapActivity(organizationId), organizationId, siteId);
}

export function listOrgMapMarkers(
  organizationId: string,
  siteId: string | 'all' = 'all',
): OrgMapMarker[] {
  return inScope(remapMarkers(organizationId), organizationId, siteId);
}

export function listOrgAttention(
  organizationId: string,
  siteId: string | 'all' = 'all',
): OrgAttentionItem[] {
  const incidents = listIncidents(organizationId, siteId).filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED',
  );
  const cams = listOrgCameras(organizationId, siteId);
  const fromIncidents: OrgAttentionItem[] = incidents.map((incident) => ({
    id: incident.id,
    organizationId,
    siteId: incident.siteId,
    kind: incident.type === 'PANIC' ? 'panic' : 'incident',
    severity: incident.severity,
    title: `${incident.type} · ${incident.subject}`,
    location: `${incident.siteName} · ${incident.location}`,
    detail: incident.ageLabel,
    cameraId: cams[1]?.id ?? cams[0]?.id,
  }));
  const fromCameras: OrgAttentionItem[] = cams
    .filter((c) => c.status !== 'ONLINE')
    .map((camera) => ({
      id: `att-${camera.id}`,
      organizationId,
      siteId: camera.siteId,
      kind: 'camera_offline' as const,
      severity: camera.status === 'OFFLINE' ? ('high' as const) : ('medium' as const),
      title: camera.status === 'OFFLINE' ? `${camera.name} offline` : `${camera.name} degraded`,
      location: camera.location,
      detail: camera.offlineFor ? `Offline for ${camera.offlineFor}` : 'Weak connection',
      cameraId: camera.id,
    }));
  const fromGates: OrgAttentionItem[] = listGates(organizationId, siteId)
    .filter((g) => g.status === 'OPEN' || g.status === 'OFFLINE')
    .map((gate) => ({
      id: `att-${gate.id}`,
      organizationId,
      siteId: gate.siteId,
      kind: 'gate_open' as const,
      severity: 'medium' as const,
      title: gate.status === 'OPEN' ? `${gate.name} left open` : `${gate.name} offline`,
      location: gate.siteName,
      detail: gate.status === 'OPEN' ? 'Open beyond dwell time' : 'Controller not responding',
    }));
  const markers = listOrgMapMarkers(organizationId, siteId);
  const fromSensors: OrgAttentionItem[] = markers
    .filter((m) => (m.kind === 'sensor' || m.kind === 'fire') && m.tone !== 'ok')
    .map((marker) => ({
      id: `att-${marker.id}`,
      organizationId,
      siteId: marker.siteId,
      kind: marker.kind === 'fire' ? ('fire' as const) : ('sensor' as const),
      severity: marker.tone === 'danger' ? ('high' as const) : ('medium' as const),
      title:
        marker.kind === 'fire'
          ? `${marker.label} — trouble`
          : `${marker.label} motion`,
      location: marker.label,
      detail: marker.kind === 'fire' ? 'Supervisory, not an alarm' : 'Demo motion event',
    }));
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...fromIncidents, ...fromCameras, ...fromGates, ...fromSensors].sort(
    (a, b) => rank[a.severity] - rank[b.severity],
  );
}

export function searchOrgOps(
  organizationId: string,
  query: string,
  siteId: string | 'all' = 'all',
): OrgSearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const base = `/org/${organizationId}`;
  const hits: OrgSearchHit[] = [];
  for (const camera of listOrgCameras(organizationId, siteId)) {
    if (`${camera.name} ${camera.location}`.toLowerCase().includes(q)) {
      hits.push({
        id: camera.id,
        kind: 'camera',
        label: camera.name,
        detail: camera.location,
        href: `${base}/cctv?camera=${camera.id}`,
      });
    }
  }
  for (const incident of listIncidents(organizationId, siteId)) {
    if (`${incident.type} ${incident.subject} ${incident.location}`.toLowerCase().includes(q)) {
      hits.push({
        id: incident.id,
        kind: 'incident',
        label: `${incident.type} · ${incident.subject}`,
        detail: incident.location,
        href: `${base}/incidents`,
      });
    }
  }
  for (const gate of listGates(organizationId, siteId)) {
    if (gate.name.toLowerCase().includes(q)) {
      hits.push({
        id: gate.id,
        kind: 'gate',
        label: gate.name,
        detail: gate.siteName,
        href: `${base}/gates`,
      });
    }
  }
  for (const person of listPeople(organizationId)) {
    if (person.name.toLowerCase().includes(q)) {
      hits.push({
        id: person.id,
        kind: 'person',
        label: person.name,
        detail: person.role,
        href: `${base}/people`,
      });
    }
  }
  for (const site of listSites(organizationId)) {
    if (site.name.toLowerCase().includes(q) && (siteId === 'all' || site.id === siteId)) {
      hits.push({
        id: site.id,
        kind: 'site',
        label: site.name,
        detail: site.siteType,
        href: `${base}/sites`,
      });
    }
  }
  const assets = ['fire panel', 'assembly point', 'hose reel', 'fence wire', 'pir sensor', 'zone 3'];
  for (const asset of assets) {
    if (asset.includes(q) || q.includes(asset.split(' ')[0]!)) {
      hits.push({
        id: `asset-${asset}`,
        kind: 'asset',
        label: asset,
        detail: 'Connected site asset · demo',
        href: `${base}/map`,
      });
    }
  }
  return hits.slice(0, 8);
}
