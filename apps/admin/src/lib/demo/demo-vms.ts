/** Demo-mode VMS backend: recordings, exports, device config, e-maps, alarm-video rules, history, audit. */

import {
  ALARM_TYPE_TREE,
  DAY_MS,
  dayStart,
  defaultCameraConfig,
  defaultRecordSchedule,
  levelFromSeverity,
  toDateKey,
  type AlarmFeedItem,
  type AlarmHistoryRow,
  type AlarmVideoRule,
  type CameraConfig,
  type DeviceTestResult,
  type DiscoveredDevice,
  type ExportJob,
  type Floorplan,
  type OpsAuditCategory,
  type OpsAuditEntry,
  type RecordSchedule,
  type RecordingSegment,
  type VmsCamera,
  type VmsSiteNode,
  type VmsTree,
} from '../vms/types';
import {
  acknowledgeDemoDeskEvent,
  listDemoDeskEvents,
  pushDemoDeskEvent,
} from './demo-arc';
import { demoCctvSystems, type DemoCctvSystem } from './demo-cctv-systems';
import { demoSurveillanceSites, demoVehicleCameraFeeds } from './demo-sites';

type Payload = Record<string, unknown>;

export type VmsDemoRequest = {
  clean: string;
  method: string;
  payload: Payload;
  params: URLSearchParams;
  actor: string;
};

type Result = { handled: true; response: unknown } | { handled: false };

function ok<T>(data: T): Result {
  return { handled: true, response: { success: true, data } };
}

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Resource tree                                                       */
/* ------------------------------------------------------------------ */

function recorderFor(siteId: string): DemoCctvSystem | undefined {
  return demoCctvSystems.find((s) => s.property.id === siteId);
}

export function buildDemoVmsTree(): VmsTree {
  const sites: VmsSiteNode[] = demoSurveillanceSites.map((site) => {
    const kit = recorderFor(site.id);
    const recorderId = kit?.id ?? `rec-${site.id}`;
    return {
      id: site.id,
      name: site.name,
      address: site.address,
      alarmStatus: site.alarmStatus,
      group: 'SITE',
      recorders: [
        {
          id: recorderId,
          name: kit?.name ?? `${site.name} NVR`,
          kind: (kit?.recorderType as 'NVR' | 'DVR') ?? 'NVR',
          ip: kit?.recorderIp ?? null,
          status: kit?.status ?? (site.onlineCameras > 0 ? 'ONLINE' : 'OFFLINE'),
          cameras: site.cameras.map((c) => ({
            id: c.id,
            name: c.name,
            locationLabel: c.locationLabel,
            channel: c.channel,
            status: c.status,
            snapshotUrl: c.snapshotUrl,
            isLiveCapable: c.isLiveCapable,
            isInterior: c.isInterior,
            siteId: site.id,
            siteName: site.name,
            recorderId,
          })),
        },
      ],
    };
  });
  const vehicles: VmsSiteNode[] = demoVehicleCameraFeeds.map((v) => ({
    id: v.vehicleId,
    name: `${v.registration} · ${v.label}`,
    address: 'Mobile',
    alarmStatus: 'DISARMED',
    group: 'VEHICLE',
    recorders: [
      {
        id: `mdvr-${v.vehicleId}`,
        name: 'Mobile DVR',
        kind: 'DASHCAM',
        ip: null,
        status: 'ONLINE',
        cameras: v.cameras.map((c) => ({
          id: c.id,
          name: c.name,
          locationLabel: c.locationLabel,
          channel: c.channel,
          status: c.status,
          snapshotUrl: c.snapshotUrl,
          isLiveCapable: c.isLiveCapable,
          isInterior: c.isInterior,
          siteId: v.vehicleId,
          siteName: v.registration,
          recorderId: `mdvr-${v.vehicleId}`,
        })),
      },
    ],
  }));
  return { sites: [...sites, ...vehicles], demo: true };
}

function allCameras(): VmsCamera[] {
  return buildDemoVmsTree().sites.flatMap((s) => s.recorders.flatMap((r) => r.cameras));
}

function findCamera(id: string) {
  return allCameras().find((c) => c.id === id) ?? null;
}

function cameraName(id: string) {
  const cam = findCamera(id);
  if (cam) return cam.name;
  for (const kit of demoCctvSystems) {
    const hit = kit.cameras.find((c) => c.id === id);
    if (hit) return hit.name;
  }
  return id;
}

/* ------------------------------------------------------------------ */
/* Operations audit                                                    */
/* ------------------------------------------------------------------ */

const audit: OpsAuditEntry[] = [];

export function logDemoAudit(
  actor: string,
  category: OpsAuditCategory,
  action: string,
  target: string,
  detail?: string | null,
) {
  audit.unshift({
    id: `audit-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    at: new Date().toISOString(),
    actor,
    category,
    action,
    target,
    detail: detail ?? null,
  });
  if (audit.length > 500) audit.length = 500;
}

(function seedAudit() {
  const seeds: Array<[number, string, OpsAuditCategory, string, string, string | null]> = [
    [25, 'Control Room', 'ALARM', 'Alarm acknowledged', 'Home — Umhlanga', 'Motion detected — front gate'],
    [60, 'Lerato Mokoena', 'EXPORT', 'Clip exported', 'Garage', 'MP4 · 2 min · INC-2041'],
    [95, 'Lerato Mokoena', 'PLAYBACK', 'Playback viewed', 'Front gate', 'Window 08:00–09:00'],
    [150, 'Thabo Nkosi', 'CONFIG', 'Encoding staged', 'Front entrance', 'Main stream H.265 · 4096 kbps'],
    [180, 'Thabo Nkosi', 'DEVICE', 'Device added', 'HiLook 4-Channel Analog Kit', '192.168.1.108'],
  ];
  for (const [mins, actor, category, action, target, detail] of seeds) {
    audit.push({
      id: `audit-seed-${mins}`,
      at: new Date(Date.now() - mins * 60_000).toISOString(),
      actor,
      category,
      action,
      target,
      detail,
    });
  }
})();

/* ------------------------------------------------------------------ */
/* Recordings                                                          */
/* ------------------------------------------------------------------ */

function recordingsFor(cameraId: string, dateKey: string): RecordingSegment[] {
  const start = dayStart(dateKey);
  const now = Date.now();
  if (start > now) return [];
  const end = Math.min(start + DAY_MS, now);
  const rand = seeded(`${cameraId}:${dateKey}`);
  const segments: RecordingSegment[] = [];

  const gapCount = Math.floor(rand() * 3);
  const gaps = Array.from({ length: gapCount }, () => {
    const at = start + rand() * DAY_MS;
    return [at, at + (10 + rand() * 50) * 60_000] as const;
  }).sort((a, b) => a[0] - b[0]);
  let cursor = start;
  for (const [gs, ge] of gaps) {
    if (gs > cursor && gs < end) segments.push({ start: iso(cursor), end: iso(Math.min(gs, end)), kind: 'CONTINUOUS' });
    cursor = Math.max(cursor, ge);
  }
  if (cursor < end) segments.push({ start: iso(cursor), end: iso(end), kind: 'CONTINUOUS' });

  const motion = 8 + Math.floor(rand() * 14);
  for (let i = 0; i < motion; i += 1) {
    const at = start + rand() * DAY_MS;
    const stop = at + (1 + rand() * 9) * 60_000;
    if (at < end) segments.push({ start: iso(at), end: iso(Math.min(stop, end)), kind: 'MOTION' });
  }
  const vca = Math.floor(rand() * 4);
  for (let i = 0; i < vca; i += 1) {
    const at = start + rand() * DAY_MS;
    if (at < end) {
      segments.push({ start: iso(at), end: iso(Math.min(at + 3 * 60_000, end)), kind: 'ANALYTICS', label: 'Line crossing' });
    }
  }

  const cam = findCamera(cameraId);
  if (cam) {
    for (const row of historyRows()) {
      if (row.siteId !== cam.siteId) continue;
      if (row.cameraId && row.cameraId !== cameraId) continue;
      const t = new Date(row.time).getTime();
      if (t < start || t >= start + DAY_MS) continue;
      segments.push({
        start: iso(t - 30_000),
        end: iso(Math.min(t + 4 * 60_000, now)),
        kind: 'ALARM',
        eventId: row.id,
        label: row.type,
      });
    }
  }
  return segments.sort((a, b) => a.start.localeCompare(b.start));
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

/* ------------------------------------------------------------------ */
/* Export jobs                                                         */
/* ------------------------------------------------------------------ */

type JobState = ExportJob & { runMs: number; resumedAt: number | null; durationMs: number };

const jobs: JobState[] = [];

function refreshJob(job: JobState) {
  if (job.status !== 'RUNNING') return job;
  const elapsed = job.runMs + (job.resumedAt ? Date.now() - job.resumedAt : 0);
  job.progress = Math.min(100, Math.round((elapsed / job.durationMs) * 100));
  if (job.progress >= 100) {
    job.status = 'DONE';
    job.runMs = job.durationMs;
    job.resumedAt = null;
  }
  return job;
}

function publicJob(job: JobState): ExportJob {
  const { runMs: _r, resumedAt: _a, durationMs: _d, ...rest } = refreshJob(job);
  return rest;
}

function createJob(input: Payload, actor: string): ExportJob {
  const cameraId = String(input.cameraId ?? '');
  const cam = findCamera(cameraId);
  if (!cam) throw new Error('Camera not found');
  const startMs = new Date(String(input.start ?? '')).getTime();
  const endMs = new Date(String(input.end ?? '')).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error('Choose a valid export range');
  }
  if (endMs - startMs > 6 * 3600_000) throw new Error('Exports are limited to 6 hours per clip');
  const seconds = (endMs - startMs) / 1000;
  const format = input.format === 'AVI' ? 'AVI' : 'MP4';
  const stamp = toDateKey(new Date(startMs)).replace(/-/g, '');
  const job: JobState = {
    id: `exp-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
    cameraId,
    cameraName: cam.name,
    siteName: cam.siteName,
    start: iso(startMs),
    end: iso(endMs),
    format,
    incidentRef: typeof input.incidentRef === 'string' && input.incidentRef.trim() ? input.incidentRef.trim() : null,
    status: 'RUNNING',
    progress: 0,
    sizeMb: Math.max(1, Math.round(seconds * 0.5)),
    path: `/exports/${cam.siteName.replace(/\W+/g, '-').toLowerCase()}/${stamp}-${cam.name.replace(/\W+/g, '-').toLowerCase()}.${format.toLowerCase()}`,
    createdAt: new Date().toISOString(),
    createdBy: actor,
    runMs: 0,
    resumedAt: Date.now(),
    durationMs: Math.min(45_000, 6_000 + seconds * 15),
  };
  jobs.unshift(job);
  logDemoAudit(
    actor,
    'EXPORT',
    'Clip export queued',
    cam.name,
    `${format} · ${Math.round(seconds / 60)} min${job.incidentRef ? ` · ${job.incidentRef}` : ''}`,
  );
  return publicJob(job);
}

function jobAction(id: string, action: string, actor: string) {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error('Export job not found');
  refreshJob(job);
  if (action === 'pause' && job.status === 'RUNNING') {
    job.runMs += job.resumedAt ? Date.now() - job.resumedAt : 0;
    job.resumedAt = null;
    job.status = 'PAUSED';
  } else if (action === 'resume' && job.status === 'PAUSED') {
    job.resumedAt = Date.now();
    job.status = 'RUNNING';
  } else if (action === 'cancel' && (job.status === 'RUNNING' || job.status === 'PAUSED' || job.status === 'QUEUED')) {
    job.status = 'CANCELLED';
    job.resumedAt = null;
    logDemoAudit(actor, 'EXPORT', 'Clip export cancelled', job.cameraName, null);
  }
  return publicJob(job);
}

/* ------------------------------------------------------------------ */
/* Device config, schedules, discovery                                 */
/* ------------------------------------------------------------------ */

const configs = new Map<string, CameraConfig>();
const schedules = new Map<string, RecordSchedule>();
const timeSync = new Map<string, string>();

const discovered: DiscoveredDevice[] = [
  { id: 'disc-1', ip: '192.168.1.30', port: 80, vendor: 'Dahua', model: 'NVR2208-8P', kind: 'NVR', serial: '210235TSL8321A000003', firmware: 'V4.001.0000000.5', macAddress: '3C:EF:8C:12:44:01', channels: 8, added: false },
  { id: 'disc-2', ip: '192.168.1.13', port: 80, vendor: 'Hikvision', model: 'DS-2CD2386G2-IU', kind: 'IPC', serial: '210235TRR83219000163', firmware: 'V5.7.3', macAddress: '44:19:B6:20:01:13', channels: 1, added: false },
  { id: 'disc-3', ip: '192.168.1.11', port: 80, vendor: 'Hikvision', model: 'DS-2CD2043G2-I', kind: 'IPC', serial: '210235U92J323C000553', firmware: 'V5.7.1', macAddress: '44:19:B6:20:01:11', channels: 1, added: false },
  { id: 'disc-4', ip: '192.168.1.14', port: 80, vendor: 'Uniview', model: 'IPC3614SB-ADF28KM', kind: 'IPC', serial: '210235U3KL3233000074', firmware: 'GIPC-B6203.15.6', macAddress: '6C:F1:7E:30:22:14', channels: 1, added: false },
  { id: 'disc-5', ip: '192.168.1.108', port: 37777, vendor: 'HiLook', model: 'DVR-204G-K1', kind: 'DVR', serial: 'HL-DVR-4CH-88421', firmware: 'V4.30.100', macAddress: 'BC:AD:28:11:08:01', channels: 4, added: false },
  { id: 'disc-6', ip: '192.168.1.10', port: 80, vendor: 'Uniview', model: 'IPC501-FC-4M-T', kind: 'IPC', serial: '210235U3KM3233000144', firmware: 'GIPC-B6202.16.9', macAddress: '6C:F1:7E:30:22:10', channels: 1, added: false },
];

function listDiscovered() {
  const ips = new Set(demoCctvSystems.map((s) => s.recorderIp).filter(Boolean));
  return discovered.map((d) => ({ ...d, added: d.added || ips.has(d.ip) }));
}

function propertyFor(propertyId: string | undefined): DemoCctvSystem['property'] {
  const site = demoSurveillanceSites.find((s) => s.id === propertyId) ?? demoSurveillanceSites[0];
  return {
    id: site.id,
    name: site.name,
    address: site.address,
    propertyType: site.propertyType,
    client: site.owner ? { id: site.owner.id, name: site.owner.name, email: site.owner.email } : null,
  };
}

function createSystem(input: {
  name: string;
  brand: string;
  model: string;
  recorderType: string;
  ip: string | null;
  serial: string | null;
  firmware: string | null;
  channels: number;
  propertyId?: string;
}): DemoCctvSystem {
  const stamp = new Date().toISOString();
  const id = `demo-cctv-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
  const system: DemoCctvSystem = {
    id,
    name: input.name,
    brand: input.brand,
    model: input.model,
    kitSku: null,
    supplier: null,
    recorderType: input.recorderType,
    channelCount: input.channels,
    connectivity: 'LAN',
    recorderSerial: input.serial,
    recorderIp: input.ip,
    cloudId: null,
    hddInstalled: input.recorderType !== 'IPC',
    hddSerial: null,
    hddCapacityGb: input.recorderType !== 'IPC' ? 2000 : null,
    firmware: input.firmware,
    mobileAppEnabled: true,
    techNotes: null,
    status: 'ONLINE',
    installedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    property: propertyFor(input.propertyId),
    cameras: Array.from({ length: input.channels }, (_, i) => ({
      id: `${id}-cam-${i + 1}`,
      name: input.channels === 1 ? input.model : `Channel ${i + 1}`,
      locationLabel: `Channel ${i + 1}`,
      channel: i + 1,
      serialNumber: null,
      model: input.model,
      resolution: '4MP',
      placement: 'EXTERIOR',
      status: 'ONLINE',
      vendor: input.brand,
    })),
  };
  demoCctvSystems.unshift(system);
  return system;
}

function testDevice(id: string): DeviceTestResult {
  const kit = demoCctvSystems.find((s) => s.id === id);
  if (!kit) throw new Error('Device not found');
  const testedAt = new Date().toISOString();
  if (!kit.recorderIp && !kit.cloudId) {
    return { ok: false, latencyMs: null, channelsOnline: 0, channelsTotal: kit.channelCount, message: 'No IP address or cloud ID on record', testedAt };
  }
  const online = kit.cameras.filter((c) => c.status === 'ONLINE').length;
  const rand = seeded(`${id}:${Math.floor(Date.now() / 10_000)}`);
  return {
    ok: kit.status !== 'OFFLINE',
    latencyMs: Math.round(8 + rand() * 60),
    channelsOnline: online,
    channelsTotal: kit.cameras.length,
    message: kit.status === 'OFFLINE' ? 'Recorder did not respond' : `Reachable · ${online}/${kit.cameras.length} channels streaming`,
    testedAt,
  };
}

function patchSystem(id: string, body: Payload) {
  const kit = demoCctvSystems.find((s) => s.id === id);
  if (!kit) throw new Error('CCTV system not found');
  const str = (key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim() || null : undefined);
  const name = str('name');
  if (name) kit.name = name;
  const fields = ['brand', 'model', 'recorderIp', 'recorderSerial', 'cloudId', 'firmware', 'techNotes', 'hddSerial'] as const;
  for (const key of fields) {
    const v = str(key);
    if (v !== undefined) (kit as unknown as Record<string, unknown>)[key] = v;
  }
  if (typeof body.status === 'string') kit.status = body.status;
  if (typeof body.hddCapacityGb === 'number') kit.hddCapacityGb = body.hddCapacityGb;
  if (typeof body.hddInstalled === 'boolean') kit.hddInstalled = body.hddInstalled;
  if (Array.isArray(body.cameras)) {
    for (const row of body.cameras as Array<Record<string, unknown>>) {
      const cam = kit.cameras.find((c) => c.id === row.id);
      if (!cam) continue;
      if (typeof row.name === 'string' && row.name.trim()) cam.name = row.name.trim();
      if (typeof row.locationLabel === 'string') cam.locationLabel = row.locationLabel;
      if (row.placement === 'INTERIOR' || row.placement === 'EXTERIOR') cam.placement = row.placement;
    }
  }
  kit.updatedAt = new Date().toISOString();
  return kit;
}

/* ------------------------------------------------------------------ */
/* Floor plans                                                         */
/* ------------------------------------------------------------------ */

function floorplanSvg(seed: string) {
  const rand = seeded(seed);
  const rooms: string[] = [];
  const cols = 4;
  const rows = 3;
  const w = 1000 / cols;
  const h = 640 / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (rand() < 0.15) continue;
      const span = rand() < 0.2 && c < cols - 1 ? 2 : 1;
      rooms.push(
        `<rect x="${20 + c * w}" y="${20 + r * h}" width="${span * w - 20}" height="${h - 20}" fill="#f7f7f5" stroke="#3a3a3a" stroke-width="3"/>`,
      );
      if (span === 2) c += 1;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 660"><rect width="1020" height="660" fill="#e9e9e4"/>${rooms.join('')}<rect x="470" y="300" width="80" height="60" fill="#d9d9d2" stroke="#3a3a3a" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const floorplans: Floorplan[] = demoSurveillanceSites.slice(0, 2).map((site, idx) => ({
  id: `fp-${site.id}`,
  propertyId: site.id,
  propertyName: site.name,
  name: idx === 0 ? 'Ground floor' : 'Main level',
  imageUrl: floorplanSvg(site.id),
  placements: site.cameras.map((c, i) => ({
    cameraId: c.id,
    x: 0.15 + ((i * 0.27) % 0.75),
    y: i % 2 === 0 ? 0.22 : 0.72,
  })),
  updatedAt: new Date().toISOString(),
}));

/* ------------------------------------------------------------------ */
/* Alarm-video rules + feed                                            */
/* ------------------------------------------------------------------ */

const firstSite = demoSurveillanceSites[0];
const rules: AlarmVideoRule[] = firstSite
  ? [
      {
        id: 'rule-1',
        cameraId: firstSite.cameras[0]?.id ?? '',
        alarmType: 'MOTION_STARTED',
        enabled: true,
        level: 2,
        actions: {
          popup: true,
          popupSeconds: 30,
          linkedCameraIds: firstSite.cameras.slice(0, 2).map((c) => c.id),
          record: true,
          presetNo: null,
          alarmOutput: null,
          email: false,
        },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rule-2',
        cameraId: firstSite.cameras[2]?.id ?? firstSite.cameras[0]?.id ?? '',
        alarmType: 'ALARM_INPUT_STARTED',
        enabled: true,
        level: 1,
        actions: {
          popup: true,
          popupSeconds: 60,
          linkedCameraIds: firstSite.cameras.slice(2, 4).map((c) => c.id),
          record: true,
          presetNo: 1,
          alarmOutput: 'Siren relay 1',
          email: true,
        },
        updatedAt: new Date().toISOString(),
      },
    ]
  : [];

const testEventRules = new Map<string, string>();

function eventAlarmType(type: string) {
  const t = type.toUpperCase();
  if (t.includes('MOTION')) return 'MOTION_STARTED';
  if (t.includes('LINE')) return 'LINE_CROSSING';
  if (t.includes('TAMPER')) return 'TAMPER_STARTED';
  if (t.includes('OFFLINE')) return 'DEVICE_OFFLINE';
  if (t.includes('VIDEO_LOSS')) return 'VIDEO_LOSS';
  if (t.includes('FACE')) return 'FACE_DETECTED';
  return 'ALARM_INPUT_STARTED';
}

function siteName(siteId: string) {
  return demoSurveillanceSites.find((s) => s.id === siteId)?.name ?? siteId;
}

function alarmFeed(): AlarmFeedItem[] {
  const cams = allCameras();
  const items: AlarmFeedItem[] = [];
  for (const event of listDemoDeskEvents()) {
    if (!['NEW', 'OPEN'].includes(event.status.toUpperCase())) continue;
    const siteCams = cams.filter((c) => c.siteId === event.propertyId);
    const code = eventAlarmType(event.type);
    const forced = testEventRules.get(event.id);
    const rule =
      (forced ? rules.find((r) => r.id === forced && r.actions.popup) : undefined) ??
      rules.find(
        (r) => r.enabled && r.actions.popup && r.alarmType === code && siteCams.some((c) => c.id === r.cameraId),
      );
    if (!rule) continue;
    const linked = (rule.actions.linkedCameraIds.length ? rule.actions.linkedCameraIds : [rule.cameraId])
      .map((id) => cams.find((c) => c.id === id))
      .filter((c): c is VmsCamera => Boolean(c));
    items.push({
      eventId: event.id,
      title: event.title,
      type: event.type,
      siteId: event.propertyId,
      siteName: siteName(event.propertyId),
      triggeredAt: event.triggeredAt,
      level: rule.level || levelFromSeverity(event.severity),
      ruleId: rule.id,
      popupSeconds: rule.actions.popupSeconds,
      cameras: linked,
    });
  }
  return items;
}

function testRule(id: string, actor: string) {
  const rule = rules.find((r) => r.id === id);
  if (!rule) throw new Error('Rule not found');
  const cam = findCamera(rule.cameraId);
  if (!cam) throw new Error('Rule camera not found');
  const typeMap: Record<string, string> = {
    MOTION_STARTED: 'MOTION',
    LINE_CROSSING: 'LINE_CROSSING',
    TAMPER_STARTED: 'TAMPER',
    DEVICE_OFFLINE: 'CAMERA_OFFLINE',
    VIDEO_LOSS: 'VIDEO_LOSS',
    FACE_DETECTED: 'FACE_DETECTED',
  };
  const label = ALARM_TYPE_TREE.flatMap((g) => g.types).find((t) => t.code === rule.alarmType)?.label ?? rule.alarmType;
  const event = pushDemoDeskEvent({
    id: `demo-ev-test-${Date.now()}`,
    propertyId: cam.siteId,
    title: `${label} — ${cam.name} (test)`,
    type: typeMap[rule.alarmType] ?? 'INTRUSION',
    severity: rule.level <= 1 ? 'CRITICAL' : rule.level === 2 ? 'HIGH' : 'MEDIUM',
    status: 'NEW',
    requiresAck: true,
    triggeredAt: new Date().toISOString(),
    zoneNumber: null,
    reportAsType: null,
    requiredAction: 'Test alarm from camera rule — acknowledge to clear',
  });
  historyCameraMap.set(event.id, cam.id);
  testEventRules.set(event.id, rule.id);
  logDemoAudit(actor, 'ALARM', 'Test alarm fired', cam.name, label);
  return alarmFeed().find((f) => f.eventId === event.id) ?? null;
}

function putRules(rows: unknown[], actor: string) {
  for (const raw of rows as Array<Partial<AlarmVideoRule>>) {
    if (!raw.cameraId || !raw.alarmType) continue;
    const existing = rules.find((r) => (raw.id && r.id === raw.id) || (r.cameraId === raw.cameraId && r.alarmType === raw.alarmType));
    const next: AlarmVideoRule = {
      id: existing?.id ?? `rule-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
      cameraId: raw.cameraId,
      alarmType: raw.alarmType,
      enabled: raw.enabled ?? true,
      level: Math.min(5, Math.max(1, Number(raw.level ?? 3))),
      actions: {
        popup: raw.actions?.popup ?? true,
        popupSeconds: Math.min(600, Math.max(5, Number(raw.actions?.popupSeconds ?? 30))),
        linkedCameraIds: raw.actions?.linkedCameraIds ?? [raw.cameraId],
        record: raw.actions?.record ?? true,
        presetNo: raw.actions?.presetNo ?? null,
        alarmOutput: raw.actions?.alarmOutput ?? null,
        email: raw.actions?.email ?? false,
      },
      updatedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, next);
    else rules.push(next);
    logDemoAudit(actor, 'ALARM', existing ? 'Alarm rule updated' : 'Alarm rule created', cameraName(next.cameraId), next.alarmType);
  }
  return rules.slice();
}

/* ------------------------------------------------------------------ */
/* Alarm history                                                       */
/* ------------------------------------------------------------------ */

const historyCameraMap = new Map<string, string>();
const acks = new Map<string, { by: string; at: string; remark: string | null }>();
let archive: AlarmHistoryRow[] | null = null;

const HISTORY_TYPES = [
  'Motion Detection Started',
  'Motion Detection Ended',
  'Device Offline',
  'Video Loss Started',
  'Cross Line Detection',
  'Tampering Detection Started',
  'Alarm Input Started',
];

function archiveRows(): AlarmHistoryRow[] {
  if (archive) return archive;
  const rand = seeded('alarm-archive');
  const cams = allCameras().filter((c) => !c.recorderId.startsWith('mdvr-'));
  const rows: AlarmHistoryRow[] = [];
  const operators = ['Lerato Mokoena', 'Thabo Nkosi', 'Control Room'];
  for (let i = 0; i < 240 && cams.length; i += 1) {
    const cam = cams[Math.floor(rand() * cams.length)];
    const type = HISTORY_TYPES[Math.floor(rand() * HISTORY_TYPES.length)];
    const ago = rand() * 7 * DAY_MS + 30 * 60_000;
    const time = new Date(Date.now() - ago).toISOString();
    const level = type.includes('Ended') ? 5 : type.includes('Offline') || type.includes('Loss') ? 2 : 1 + Math.floor(rand() * 4);
    const acked = ago > 6 * 3600_000 && rand() < 0.7;
    rows.push({
      id: `hist-${i}`,
      time,
      siteId: cam.siteId,
      siteName: cam.siteName,
      source: cam.name,
      cameraId: cam.id,
      type,
      level,
      status: acked ? 'ACKNOWLEDGED' : 'NOT_ACKNOWLEDGED',
      ackBy: acked ? operators[Math.floor(rand() * operators.length)] : null,
      ackAt: acked ? new Date(Date.now() - ago + 5 * 60_000).toISOString() : null,
      remarks: acked && rand() < 0.3 ? 'Verified on CCTV — no threat' : null,
      live: false,
    });
  }
  archive = rows;
  return rows;
}

function historyRows(): AlarmHistoryRow[] {
  const live: AlarmHistoryRow[] = listDemoDeskEvents().map((e) => {
    const ack = acks.get(e.id);
    const acknowledged = Boolean(ack) || !['NEW', 'OPEN'].includes(e.status.toUpperCase());
    return {
      id: e.id,
      time: e.triggeredAt,
      siteId: e.propertyId,
      siteName: siteName(e.propertyId),
      source: e.sensorName ?? (historyCameraMap.get(e.id) ? cameraName(historyCameraMap.get(e.id)!) : e.title),
      cameraId: historyCameraMap.get(e.id) ?? null,
      type: e.type.replace(/_/g, ' '),
      level: levelFromSeverity(e.severity),
      status: acknowledged ? 'ACKNOWLEDGED' : 'NOT_ACKNOWLEDGED',
      ackBy: ack?.by ?? e.claimedByName ?? (acknowledged ? 'Control Room' : null),
      ackAt: ack?.at ?? e.claimedAt ?? null,
      remarks: ack?.remark ?? null,
      live: true,
    };
  });
  const old = archiveRows().map((row) => {
    const ack = acks.get(row.id);
    return ack ? { ...row, status: 'ACKNOWLEDGED' as const, ackBy: ack.by, ackAt: ack.at, remarks: ack.remark ?? row.remarks } : row;
  });
  return [...live, ...old].sort((a, b) => b.time.localeCompare(a.time));
}

function queryHistory(params: URLSearchParams) {
  const scope = params.get('scope') ?? 'history';
  const from = params.get('from') ? new Date(params.get('from')!).getTime() : Date.now() - DAY_MS;
  const to = params.get('to') ? new Date(params.get('to')!).getTime() : Date.now();
  const type = params.get('type') ?? '';
  const status = params.get('status') ?? '';
  const source = (params.get('source') ?? '').toLowerCase();
  const ackBy = params.get('ackBy') ?? '';
  const levels = (params.get('levels') ?? '1,2,3,4,5').split(',').map(Number).filter(Boolean);
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(5, Number(params.get('pageSize') ?? 20)));

  const all = historyRows();
  let rows = all.filter((r) => levels.includes(r.level));
  if (scope === 'latest') {
    rows = rows.filter((r) => Date.now() - new Date(r.time).getTime() < DAY_MS);
  } else {
    rows = rows.filter((r) => {
      const t = new Date(r.time).getTime();
      return t >= from && t <= to;
    });
  }
  if (type) rows = rows.filter((r) => r.type.toLowerCase() === type.toLowerCase());
  if (status) rows = rows.filter((r) => r.status === status);
  if (source) rows = rows.filter((r) => `${r.source} ${r.siteName}`.toLowerCase().includes(source));
  if (ackBy) rows = rows.filter((r) => r.ackBy === ackBy);

  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    page,
    pageSize,
    types: Array.from(new Set(all.map((r) => r.type))).sort(),
    ackUsers: Array.from(new Set(all.map((r) => r.ackBy).filter((v): v is string => Boolean(v)))).sort(),
  };
}

function ackHistory(ids: string[], remark: string | null, actor: string) {
  const at = new Date().toISOString();
  for (const id of ids) {
    acks.set(id, { by: actor, at, remark });
    acknowledgeDemoDeskEvent(id);
  }
  logDemoAudit(actor, 'ALARM', 'Alarm acknowledged', `${ids.length} event${ids.length === 1 ? '' : 's'}`, remark);
  return { acknowledged: ids.length, at };
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export function handleVmsDemo({ clean, method, payload, params, actor }: VmsDemoRequest): Result {
  const m = method;

  if (clean === '/control-room/vms/tree' && m === 'GET') return ok(buildDemoVmsTree());

  if (clean === '/control-room/vms/recordings' && m === 'GET') {
    const date = params.get('date') ?? toDateKey(new Date());
    const ids = (params.get('cameraIds') ?? '').split(',').filter(Boolean);
    return ok({ date, cameras: ids.map((id) => ({ cameraId: id, date, segments: recordingsFor(id, date) })) });
  }

  if (clean === '/control-room/vms/exports' && m === 'GET') return ok(jobs.map(publicJob));
  if (clean === '/control-room/vms/exports' && m === 'POST') {
    const rows = Array.isArray(payload.items) ? (payload.items as Payload[]) : [payload];
    return ok(rows.map((row) => createJob(row, actor)));
  }
  if (clean === '/control-room/vms/exports/clear' && m === 'POST') {
    for (let i = jobs.length - 1; i >= 0; i -= 1) {
      if (['DONE', 'CANCELLED', 'FAILED'].includes(refreshJob(jobs[i]).status)) jobs.splice(i, 1);
    }
    return ok(jobs.map(publicJob));
  }
  if (clean === '/control-room/vms/exports/bulk' && m === 'POST') {
    const action = String(payload.action ?? '');
    for (const job of jobs) {
      try {
        jobAction(job.id, action, actor);
      } catch {
        /* skip */
      }
    }
    return ok(jobs.map(publicJob));
  }
  {
    const hit = clean.match(/^\/control-room\/vms\/exports\/([^/]+)\/(pause|resume|cancel)$/);
    if (hit && m === 'POST') return ok(jobAction(hit[1], hit[2], actor));
  }

  {
    const hit = clean.match(/^\/control-room\/vms\/cameras\/([^/]+)\/config$/);
    if (hit && m === 'GET') return ok(configs.get(hit[1]) ?? defaultCameraConfig(hit[1]));
    if (hit && m === 'PATCH') {
      const base = configs.get(hit[1]) ?? defaultCameraConfig(hit[1]);
      const next: CameraConfig = {
        ...base,
        image: { ...base.image, ...((payload.image as object) ?? {}) },
        encoding: { ...base.encoding, ...((payload.encoding as object) ?? {}) },
        osd: { ...base.osd, ...((payload.osd as object) ?? {}) },
        cameraId: hit[1],
        stagedAt: new Date().toISOString(),
      };
      configs.set(hit[1], next);
      const sections = ['image', 'encoding', 'osd'].filter((k) => payload[k]).join(', ');
      logDemoAudit(actor, 'CONFIG', 'Camera config staged', cameraName(hit[1]), sections || null);
      return ok(next);
    }
  }
  {
    const hit = clean.match(/^\/control-room\/vms\/cameras\/([^/]+)\/schedule$/);
    if (hit && m === 'GET') return ok(schedules.get(hit[1]) ?? defaultRecordSchedule(hit[1]));
    if (hit && m === 'PATCH') {
      const base = schedules.get(hit[1]) ?? defaultRecordSchedule(hit[1]);
      const next: RecordSchedule = {
        ...base,
        days: Array.isArray(payload.days) ? (payload.days as RecordSchedule['days']) : base.days,
        retentionDays: Number(payload.retentionDays ?? base.retentionDays),
        preRecordSec: Number(payload.preRecordSec ?? base.preRecordSec),
        postRecordSec: Number(payload.postRecordSec ?? base.postRecordSec),
        cameraId: hit[1],
        stagedAt: new Date().toISOString(),
      };
      schedules.set(hit[1], next);
      logDemoAudit(actor, 'CONFIG', 'Recording schedule staged', cameraName(hit[1]), `${next.retentionDays}d retention`);
      return ok(next);
    }
  }

  if (clean === '/control-room/vms/discovery' && m === 'GET') return ok(listDiscovered());
  if (clean === '/control-room/vms/discovery/add' && m === 'POST') {
    const ids = Array.isArray(payload.deviceIds) ? (payload.deviceIds as string[]) : [];
    const propertyId = typeof payload.propertyId === 'string' ? payload.propertyId : undefined;
    const created = ids
      .map((id) => discovered.find((d) => d.id === id))
      .filter((d): d is DiscoveredDevice => Boolean(d) && !d!.added)
      .map((d) => {
        d.added = true;
        const sys = createSystem({
          name: `${d.vendor} ${d.model}`,
          brand: d.vendor,
          model: d.model,
          recorderType: d.kind,
          ip: d.ip,
          serial: d.serial,
          firmware: d.firmware,
          channels: d.channels,
          propertyId,
        });
        logDemoAudit(actor, 'DEVICE', 'Device added', sys.name, `${d.ip}:${d.port}`);
        return sys;
      });
    return ok(created);
  }
  if (clean === '/control-room/vms/devices' && m === 'POST') {
    const name = String(payload.name ?? '').trim();
    const ip = String(payload.ip ?? '').trim();
    if (!name) throw new Error('Device name is required');
    if (!ip) throw new Error('IP address or domain is required');
    const sys = createSystem({
      name,
      brand: String(payload.brand ?? 'Generic ONVIF'),
      model: String(payload.model ?? 'ONVIF device'),
      recorderType: String(payload.recorderType ?? 'NVR'),
      ip: `${ip}${payload.port ? `:${payload.port}` : ''}`,
      serial: null,
      firmware: null,
      channels: Math.min(64, Math.max(1, Number(payload.channels ?? 4))),
      propertyId: typeof payload.propertyId === 'string' ? payload.propertyId : undefined,
    });
    logDemoAudit(actor, 'DEVICE', 'Device added manually', sys.name, ip);
    return ok(sys);
  }
  {
    const hit = clean.match(/^\/control-room\/vms\/devices\/([^/]+)\/(test|time-sync)$/);
    if (hit && m === 'POST') {
      if (hit[2] === 'test') {
        const result = testDevice(hit[1]);
        logDemoAudit(actor, 'DEVICE', 'Connection test', demoCctvSystems.find((s) => s.id === hit[1])?.name ?? hit[1], result.message);
        return ok(result);
      }
      const at = new Date().toISOString();
      timeSync.set(hit[1], at);
      logDemoAudit(actor, 'DEVICE', 'Time sync', demoCctvSystems.find((s) => s.id === hit[1])?.name ?? hit[1], at);
      return ok({ syncedAt: at });
    }
  }
  {
    const hit = clean.match(/^\/control-room\/cctv-systems\/([^/]+)$/);
    if (hit && m === 'PATCH') {
      const kit = patchSystem(hit[1], payload);
      logDemoAudit(actor, 'DEVICE', 'Device edited', kit.name, null);
      return ok(kit);
    }
  }

  if (clean === '/control-room/vms/floorplans' && m === 'GET') {
    const propertyId = params.get('propertyId');
    return ok(propertyId ? floorplans.filter((f) => f.propertyId === propertyId) : floorplans);
  }
  if (clean === '/control-room/vms/floorplans' && m === 'POST') {
    const propertyId = String(payload.propertyId ?? '');
    const site = demoSurveillanceSites.find((s) => s.id === propertyId);
    if (!site) throw new Error('Choose a property for the map');
    const plan: Floorplan = {
      id: `fp-${Date.now()}`,
      propertyId,
      propertyName: site.name,
      name: String(payload.name ?? '').trim() || 'Floor plan',
      imageUrl: typeof payload.imageUrl === 'string' && payload.imageUrl ? payload.imageUrl : floorplanSvg(`${propertyId}-${Date.now()}`),
      placements: [],
      updatedAt: new Date().toISOString(),
    };
    floorplans.push(plan);
    logDemoAudit(actor, 'EMAP', 'Map added', plan.name, site.name);
    return ok(plan);
  }
  {
    const hit = clean.match(/^\/control-room\/vms\/floorplans\/([^/]+)(\/placements)?$/);
    if (hit) {
      const plan = floorplans.find((f) => f.id === hit[1]);
      if (!plan) throw new Error('Map not found');
      if (hit[2] && m === 'PUT') {
        plan.placements = (Array.isArray(payload.placements) ? payload.placements : [])
          .map((p) => p as { cameraId?: string; x?: number; y?: number })
          .filter((p) => p.cameraId)
          .map((p) => ({
            cameraId: p.cameraId!,
            x: Math.min(1, Math.max(0, Number(p.x ?? 0.5))),
            y: Math.min(1, Math.max(0, Number(p.y ?? 0.5))),
          }));
        plan.updatedAt = new Date().toISOString();
        logDemoAudit(actor, 'EMAP', 'Camera placements saved', plan.name, `${plan.placements.length} devices`);
        return ok(plan);
      }
      if (!hit[2] && m === 'PATCH') {
        if (typeof payload.name === 'string' && payload.name.trim()) plan.name = payload.name.trim();
        if (typeof payload.imageUrl === 'string' && payload.imageUrl) plan.imageUrl = payload.imageUrl;
        plan.updatedAt = new Date().toISOString();
        return ok(plan);
      }
      if (!hit[2] && m === 'DELETE') {
        floorplans.splice(floorplans.indexOf(plan), 1);
        logDemoAudit(actor, 'EMAP', 'Map deleted', plan.name, plan.propertyName);
        return ok({ id: plan.id });
      }
    }
  }

  if (clean === '/control-room/vms/alarm-rules' && m === 'GET') {
    const cameraId = params.get('cameraId');
    return ok(cameraId ? rules.filter((r) => r.cameraId === cameraId) : rules.slice());
  }
  if (clean === '/control-room/vms/alarm-rules' && m === 'PUT') {
    return ok(putRules(Array.isArray(payload.rules) ? payload.rules : [], actor));
  }
  {
    const hit = clean.match(/^\/control-room\/vms\/alarm-rules\/([^/]+)(\/test)?$/);
    if (hit && hit[2] && m === 'POST') return ok(testRule(hit[1], actor));
    if (hit && !hit[2] && m === 'DELETE') {
      const idx = rules.findIndex((r) => r.id === hit[1]);
      if (idx >= 0) {
        logDemoAudit(actor, 'ALARM', 'Alarm rule deleted', cameraName(rules[idx].cameraId), rules[idx].alarmType);
        rules.splice(idx, 1);
      }
      return ok({ id: hit[1] });
    }
  }
  if (clean === '/control-room/vms/alarm-feed' && m === 'GET') return ok(alarmFeed());

  if (clean === '/control-room/alarm-history' && m === 'GET') return ok(queryHistory(params));
  if (clean === '/control-room/alarm-history/ack' && m === 'POST') {
    const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : [];
    if (!ids.length) throw new Error('Select at least one alarm');
    const remark = typeof payload.remark === 'string' && payload.remark.trim() ? payload.remark.trim() : null;
    return ok(ackHistory(ids, remark, actor));
  }

  if (clean === '/control-room/ops-audit' && m === 'GET') {
    const category = params.get('category');
    const q = (params.get('q') ?? '').toLowerCase();
    let rows = audit.slice();
    if (category) rows = rows.filter((r) => r.category === category);
    if (q) rows = rows.filter((r) => `${r.actor} ${r.action} ${r.target} ${r.detail ?? ''}`.toLowerCase().includes(q));
    return ok(rows.slice(0, 300));
  }
  if (clean === '/control-room/ops-audit' && m === 'POST') {
    const category = String(payload.category ?? 'PLAYBACK') as OpsAuditCategory;
    logDemoAudit(actor, category, String(payload.action ?? 'Action'), String(payload.target ?? ''), (payload.detail as string) ?? null);
    return ok(audit[0]);
  }

  return { handled: false };
}
