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
    id: 'onvif-profile-a',
    category: 'Access control',
    vendor: 'ONVIF Profile A',
    protocol: 'ONVIF Profile A',
    status: 'PLANNED',
    description: 'Credentials, schedules, and access rules configuration',
  },
  {
    id: 'onvif-profile-c',
    category: 'Access control',
    vendor: 'ONVIF Profile C',
    protocol: 'ONVIF Profile C',
    status: 'CONFIGURED',
    description: 'Door/access-point status & control → Physical Control Engine',
  },
  {
    id: 'onvif-profile-d',
    category: 'Access control',
    vendor: 'ONVIF Profile D',
    protocol: 'ONVIF Profile D',
    status: 'PLANNED',
    description: 'Readers, sensors, LPR cameras, output devices as ACS peripherals',
  },
  {
    id: 'pce-gates',
    category: 'Physical Control',
    vendor: '4DS Physical Control Engine',
    protocol: 'Internal command bus',
    status: 'LIVE',
    description: 'Gate open/close · hold open · forced-open detection · audited commands',
    eventsPerDay: 40,
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
  {
    id: 'voice-alexa',
    category: 'Voice SOS',
    vendor: 'Amazon Alexa',
    protocol: 'Skill webhook → VoiceIntegrationManager',
    status: 'PLANNED',
    description: 'Alexa skill contract — normalize voice levels to VOICE_COMMAND (requires Amazon skill approval)',
  },
  {
    id: 'voice-google',
    category: 'Voice SOS',
    vendor: 'Google Home / Assistant',
    protocol: 'Actions webhook → VoiceIntegrationManager',
    status: 'PLANNED',
    description: 'Google Action contract — assistance / emergency / silent SOS levels',
  },
  {
    id: 'voice-siri',
    category: 'Voice SOS',
    vendor: 'Apple Siri Shortcuts',
    protocol: 'App Intent / webhook → VoiceIntegrationManager',
    status: 'PLANNED',
    description: 'Siri Shortcuts / App Intents — native entitlement required for background SOS',
  },
  {
    id: 'voice-smartthings',
    category: 'Voice SOS',
    vendor: 'Samsung SmartThings',
    protocol: 'SmartApp webhook',
    status: 'PLANNED',
    description: 'Smart home panic / assistance routines mapped to VOICE_COMMAND',
  },
  {
    id: 'voice-home-assistant',
    category: 'Voice SOS',
    vendor: 'Home Assistant',
    protocol: 'Webhook / MQTT',
    status: 'CONFIGURED',
    description: 'HA automation webhook ingest for assistance and emergency voice phrases',
  },
  {
    id: 'voice-matter',
    category: 'Voice SOS',
    vendor: 'Matter / Thread hubs',
    protocol: 'Matter bridge → webhook',
    status: 'PLANNED',
    description: 'Matter-capable hubs forwarding emergency button / voice events',
  },
  {
    id: 'crash-apple-safetykit',
    category: 'Crash Detection',
    vendor: 'Apple SafetyKit',
    protocol: 'severe-vehicular-crash-event entitlement',
    status: 'PLANNED',
    description:
      'OS-confirmed crash → VEHICLE_CRASH_DETECTED (OS_CONFIRMED). Never claim active without App Store entitlement.',
  },
  {
    id: 'crash-android',
    category: 'Crash Detection',
    vendor: 'Android Vehicle Safety',
    protocol: 'Car App / sensors stub',
    status: 'PLANNED',
    description: 'Android Automotive / sensor-suspected impact adapter (confidence SENSOR_SUSPECTED)',
  },
  {
    id: 'crash-telematics',
    category: 'Crash Detection',
    vendor: 'Vehicle telematics / OEM',
    protocol: 'Webhook → CrashDetectionManager',
    status: 'CONFIGURED',
    description: 'Fleet / OEM / dashcam impact signals correlated into one CRASH incident',
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
    trigger: 'Access FORCED_OPEN / state mismatch',
    action: 'Create ALARM incident via Incident Kernel + CCTV preset',
    enabled: true,
    priority: 2,
  },
  {
    id: 'rule-gate-held',
    name: 'Gate held open',
    trigger: 'Access point OPEN/HELD_OPEN > 5 minutes',
    action: 'Notify control room · escalate if forced',
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
  {
    id: 'rule-voice-sos',
    name: 'Voice SOS — correlate then dispatch',
    trigger: 'VOICE_COMMAND EMERGENCY or SILENT_SOS',
    action: 'Correlate within 120s → createFromEmergency → nearest armed unit',
    enabled: true,
    priority: 1,
  },
  {
    id: 'rule-crash',
    name: 'Vehicle crash — OS or telematics',
    trigger: 'VEHICLE_CRASH_DETECTED',
    action: 'CRITICAL incident · merge with voice/vehicle panic · dispatch security',
    enabled: true,
    priority: 1,
  },
];
