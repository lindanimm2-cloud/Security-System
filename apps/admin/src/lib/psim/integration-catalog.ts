/** Integration catalog — protocols and vendors from PSIM roadmap. */

export type IntegrationStatus = 'LIVE' | 'CONFIGURED' | 'PLANNED' | 'DISABLED';

export type IntegrationEntry = {
  id: string;
  category: string;
  vendor: string;
  protocol: string;
  status: IntegrationStatus;
  description: string;
  eventsPerDay?: number;
};

export const PSIM_INTEGRATIONS: IntegrationEntry[] = [
  {
    id: 'alarm-sia',
    category: 'Alarm / ARC',
    vendor: 'Generic SIA DC-09',
    protocol: 'SIA DC-09 / Contact ID',
    status: 'LIVE',
    description: 'Alarm receiver — zone trips, restores, panel events',
    eventsPerDay: 840,
  },
  {
    id: 'alarm-paradox',
    category: 'Alarm / ARC',
    vendor: 'Paradox IP',
    protocol: 'IP Module',
    status: 'CONFIGURED',
    description: 'Direct IP panels — bypass, arm/disarm audit',
    eventsPerDay: 120,
  },
  {
    id: 'vms-onvif',
    category: 'Video',
    vendor: 'ONVIF cameras',
    protocol: 'ONVIF Profile S/T',
    status: 'LIVE',
    description: 'Live view, motion analytics hooks, PTZ presets',
    eventsPerDay: 2100,
  },
  {
    id: 'vms-milestone',
    category: 'Video',
    vendor: 'Milestone XProtect',
    protocol: 'MIP SDK',
    status: 'CONFIGURED',
    description: 'VMS bookmarks linked to incidents',
    eventsPerDay: 450,
  },
  {
    id: 'access-hid',
    category: 'Access control',
    vendor: 'HID VertX / OSDP',
    protocol: 'OSDP / REST',
    status: 'LIVE',
    description: 'Doors, readers, forced entry, tailgate alerts',
    eventsPerDay: 620,
  },
  {
    id: 'access-gallagher',
    category: 'Access control',
    vendor: 'Gallagher Command Centre',
    protocol: 'REST API',
    status: 'CONFIGURED',
    description: 'Multi-site access zones and visitor escort',
    eventsPerDay: 180,
  },
  {
    id: 'fleet-geotab',
    category: 'Fleet',
    vendor: 'Geotab',
    protocol: 'MyGeotab API',
    status: 'LIVE',
    description: 'GPS, harsh braking, ignition, geofence breach',
    eventsPerDay: 960,
  },
  {
    id: 'ptt-zello',
    category: 'Comms',
    vendor: 'Zello / PTT',
    protocol: 'Webhooks',
    status: 'CONFIGURED',
    description: 'Push-to-talk channel tied to incident rooms',
    eventsPerDay: 90,
  },
  {
    id: 'sip-trunk',
    category: 'Comms',
    vendor: 'SIP trunk',
    protocol: 'SIP / WebRTC',
    status: 'LIVE',
    description: 'Click-to-call client and officer from CAD',
    eventsPerDay: 45,
  },
  {
    id: 'whatsapp',
    category: 'Comms',
    vendor: 'WhatsApp Business',
    protocol: 'Cloud API',
    status: 'PLANNED',
    description: 'Client updates and officer tasking',
  },
  {
    id: 'patrol-guard',
    category: 'Patrol',
    vendor: 'Guard tour NFC',
    protocol: 'Mobile SDK',
    status: 'LIVE',
    description: 'Checkpoints, missed scans, e-OB / DAR',
    eventsPerDay: 320,
  },
  {
    id: 'watchlist',
    category: 'Intelligence',
    vendor: 'Internal watchlist',
    protocol: 'Event match',
    status: 'LIVE',
    description: 'Plate / ID hits against active watch entries',
    eventsPerDay: 12,
  },
];

export type DispatchRule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  priority: number;
};

export const DEMO_DISPATCH_RULES: DispatchRule[] = [
  {
    id: 'rule-panic',
    name: 'Panic — nearest armed unit',
    trigger: 'APP panic OR duress',
    action: 'Recommend 2 armed units + notify supervisor',
    enabled: true,
    priority: 1,
  },
  {
    id: 'rule-intrusion',
    name: 'Intrusion — verify then dispatch',
    trigger: 'Alarm zone trip (non-fire)',
    action: 'ACK → CCTV verify → dispatch Zone match',
    enabled: true,
    priority: 2,
  },
  {
    id: 'rule-medical',
    name: 'Medical — ALS first',
    trigger: 'Medical incident type',
    action: 'Assign medic unit + backup responder',
    enabled: true,
    priority: 1,
  },
  {
    id: 'rule-access',
    name: 'Forced door',
    trigger: 'Access FORCED_OPEN',
    action: 'Create incident + CCTV preset',
    enabled: true,
    priority: 3,
  },
  {
    id: 'rule-fleet',
    name: 'Geofence breach — high value',
    trigger: 'Fleet geofence exit (client tagged)',
    action: 'Notify dispatch + track on map',
    enabled: false,
    priority: 4,
  },
];
