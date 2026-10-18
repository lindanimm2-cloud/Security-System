import type { CctvCamera } from '@/components/portal/CctvLiveFeed';

export type VmsCamera = CctvCamera & {
  siteId: string;
  siteName: string;
  recorderId: string;
};

export type VmsRecorder = {
  id: string;
  name: string;
  kind: 'NVR' | 'DVR' | 'DASHCAM' | 'IPC';
  ip: string | null;
  status: string;
  cameras: VmsCamera[];
};

export type VmsSiteNode = {
  id: string;
  name: string;
  address: string;
  alarmStatus: string;
  group: 'SITE' | 'VEHICLE';
  recorders: VmsRecorder[];
};

export type VmsTree = {
  sites: VmsSiteNode[];
  demo?: boolean;
};

export type SegmentKind = 'CONTINUOUS' | 'MOTION' | 'ALARM' | 'ANALYTICS' | 'MANUAL';

export type RecordingSegment = {
  start: string;
  end: string;
  kind: SegmentKind;
  eventId?: string;
  label?: string;
};

export type CameraRecordings = {
  cameraId: string;
  date: string;
  segments: RecordingSegment[];
};

export type RecordingsResponse = {
  date: string;
  cameras: CameraRecordings[];
  integrationPending?: boolean;
};

export type ExportJobStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'DONE' | 'CANCELLED' | 'FAILED';

export type ExportJob = {
  id: string;
  cameraId: string;
  cameraName: string;
  siteName: string;
  start: string;
  end: string;
  format: 'MP4' | 'AVI';
  incidentRef: string | null;
  status: ExportJobStatus;
  progress: number;
  sizeMb: number;
  path: string;
  createdAt: string;
  createdBy: string;
};

export type StreamProfile = {
  enabled: boolean;
  codec: 'H.264' | 'H.265';
  resolution: string;
  fps: number;
  bitrateKbps: number;
  bitrateType: 'CBR' | 'VBR';
  gop: number;
  smartEncoding: boolean;
};

export type OsdPosition = 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';

export type CameraConfig = {
  cameraId: string;
  image: {
    brightness: number;
    contrast: number;
    saturation: number;
    sharpness: number;
    nr2d: number;
    nr3d: number;
    rotation: 'NORMAL' | 'FLIP' | 'MIRROR' | 'ROTATE_180';
  };
  encoding: {
    main: StreamProfile;
    sub: StreamProfile;
    third: StreamProfile;
  };
  osd: {
    showDate: boolean;
    showName: boolean;
    dateFormat: string;
    timeFormat: '24H' | '12H';
    datePosition: OsdPosition;
    namePosition: OsdPosition;
    overlays: Array<{ position: OsdPosition; text: string }>;
  };
  stagedAt: string | null;
  integrationPending?: boolean;
};

export type RecordMode = 'OFF' | 'CONTINUOUS' | 'MOTION' | 'ALARM';

export type RecordSchedule = {
  cameraId: string;
  /** 7 days (Mon..Sun) × 24 hourly slots. */
  days: RecordMode[][];
  retentionDays: number;
  preRecordSec: number;
  postRecordSec: number;
  stagedAt: string | null;
};

export type VmsCameraPlacement = {
  cameraId: string;
  /** Normalised 0..1 coordinates on the plan image. */
  x: number;
  y: number;
};

export type Floorplan = {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  imageUrl: string;
  placements: VmsCameraPlacement[];
  updatedAt: string;
};

export type AlarmVideoActions = {
  popup: boolean;
  popupSeconds: number;
  linkedCameraIds: string[];
  record: boolean;
  presetNo: number | null;
  alarmOutput: string | null;
  email: boolean;
};

export type AlarmVideoRule = {
  id: string;
  cameraId: string;
  alarmType: string;
  enabled: boolean;
  level: number;
  actions: AlarmVideoActions;
  updatedAt: string;
};

export type AlarmFeedItem = {
  eventId: string;
  title: string;
  type: string;
  siteId: string;
  siteName: string;
  triggeredAt: string;
  level: number;
  ruleId: string | null;
  popupSeconds: number;
  cameras: VmsCamera[];
};

export type AlarmHistoryRow = {
  id: string;
  time: string;
  siteId: string;
  siteName: string;
  source: string;
  cameraId: string | null;
  type: string;
  level: number;
  status: 'ACKNOWLEDGED' | 'NOT_ACKNOWLEDGED';
  ackBy: string | null;
  ackAt: string | null;
  remarks: string | null;
  live: boolean;
};

export type AlarmHistoryPage = {
  rows: AlarmHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
  types: string[];
  ackUsers: string[];
};

export type OpsAuditCategory = 'DEVICE' | 'CONFIG' | 'EXPORT' | 'PLAYBACK' | 'ALARM' | 'EMAP';

export type OpsAuditEntry = {
  id: string;
  at: string;
  actor: string;
  category: OpsAuditCategory;
  action: string;
  target: string;
  detail: string | null;
};

export type DiscoveredDevice = {
  id: string;
  ip: string;
  port: number;
  vendor: string;
  model: string;
  kind: 'NVR' | 'DVR' | 'IPC';
  serial: string;
  firmware: string;
  macAddress: string;
  channels: number;
  added: boolean;
};

export type DeviceTestResult = {
  ok: boolean;
  latencyMs: number | null;
  channelsOnline: number;
  channelsTotal: number;
  message: string;
  testedAt: string;
};

export const ALARM_TYPE_TREE: Array<{ group: string; types: Array<{ code: string; label: string }> }> = [
  {
    group: 'Event',
    types: [
      { code: 'MOTION_STARTED', label: 'Motion detection started' },
      { code: 'MOTION_ENDED', label: 'Motion detection ended' },
      { code: 'TAMPER_STARTED', label: 'Tampering detection started' },
      { code: 'AUDIO_STARTED', label: 'Audio detection started' },
      { code: 'MANUAL_ALARM', label: 'Manual alarm' },
      { code: 'ALARM_INPUT_STARTED', label: 'Alarm input started' },
    ],
  },
  {
    group: 'Online / Offline',
    types: [
      { code: 'DEVICE_OFFLINE', label: 'Device offline' },
      { code: 'DEVICE_ONLINE', label: 'Device online' },
      { code: 'VIDEO_LOSS', label: 'Video loss started' },
    ],
  },
  {
    group: 'VCA',
    types: [
      { code: 'LINE_CROSSING', label: 'Cross line detection' },
      { code: 'ENTER_AREA', label: 'Enter area' },
      { code: 'LOITERING', label: 'Loitering' },
      { code: 'FACE_DETECTED', label: 'Face detection' },
      { code: 'DEFOCUS', label: 'Defocus detection' },
    ],
  },
];

export function alarmTypeLabel(code: string) {
  for (const group of ALARM_TYPE_TREE) {
    const hit = group.types.find((t) => t.code === code);
    if (hit) return hit.label;
  }
  return code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export const SEGMENT_META: Record<SegmentKind, { label: string; tone: string }> = {
  CONTINUOUS: { label: 'Continuous', tone: 'continuous' },
  MOTION: { label: 'Motion', tone: 'motion' },
  ALARM: { label: 'Alarm', tone: 'alarm' },
  ANALYTICS: { label: 'Analytics (VCA)', tone: 'analytics' },
  MANUAL: { label: 'Manual', tone: 'manual' },
};

export const LEVEL_META: Record<number, { label: string; tone: string }> = {
  1: { label: 'Level 1', tone: 'l1' },
  2: { label: 'Level 2', tone: 'l2' },
  3: { label: 'Level 3', tone: 'l3' },
  4: { label: 'Level 4', tone: 'l4' },
  5: { label: 'Level 5', tone: 'l5' },
};

export function levelFromSeverity(severity?: string | null) {
  const s = (severity ?? '').toUpperCase();
  if (s === 'CRITICAL') return 1;
  if (s === 'HIGH') return 2;
  if (s === 'MEDIUM') return 3;
  if (s === 'LOW') return 4;
  return 5;
}

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dayStart(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
}

export const DAY_MS = 86_400_000;

export function formatClock(ms: number, withSeconds = true) {
  const date = new Date(ms);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (!withSeconds) return `${hh}:${mm}`;
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatDateTime(iso: string | number) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${toDateKey(date)} ${formatClock(date.getTime())}`;
}

export function playbackHref(opts: { cameraIds?: string[]; at?: string; siteId?: string }) {
  const params = new URLSearchParams({ view: 'recordings' });
  if (opts.cameraIds?.length) params.set('cams', opts.cameraIds.join(','));
  if (opts.at) params.set('at', opts.at);
  if (opts.siteId) params.set('site', opts.siteId);
  return `/control-room/surveillance?${params.toString()}`;
}

export function flattenCameras(tree: VmsTree | null | undefined): VmsCamera[] {
  if (!tree) return [];
  return tree.sites.flatMap((site) => site.recorders.flatMap((rec) => rec.cameras));
}

export function camerasForSite(tree: VmsTree | null | undefined, siteId: string): VmsCamera[] {
  const site = tree?.sites.find((s) => s.id === siteId);
  return site ? site.recorders.flatMap((r) => r.cameras) : [];
}

export function defaultRecordSchedule(cameraId: string): RecordSchedule {
  return {
    cameraId,
    days: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 'CONTINUOUS' as RecordMode)),
    retentionDays: 30,
    preRecordSec: 5,
    postRecordSec: 30,
    stagedAt: null,
  };
}

export function defaultCameraConfig(cameraId: string): CameraConfig {
  const stream = (over: Partial<StreamProfile>): StreamProfile => ({
    enabled: true,
    codec: 'H.265',
    resolution: '1920×1080',
    fps: 25,
    bitrateKbps: 4096,
    bitrateType: 'CBR',
    gop: 50,
    smartEncoding: false,
    ...over,
  });
  return {
    cameraId,
    image: { brightness: 50, contrast: 50, saturation: 50, sharpness: 50, nr2d: 50, nr3d: 50, rotation: 'NORMAL' },
    encoding: {
      main: stream({}),
      sub: stream({ resolution: '720×576 (D1)', bitrateKbps: 512 }),
      third: stream({ enabled: false, resolution: '352×288 (CIF)', bitrateKbps: 128, bitrateType: 'VBR' }),
    },
    osd: {
      showDate: true,
      showName: true,
      dateFormat: 'yyyy-MM-dd',
      timeFormat: '24H',
      datePosition: 'TOP_LEFT',
      namePosition: 'BOTTOM_RIGHT',
      overlays: [],
    },
    stagedAt: null,
  };
}
