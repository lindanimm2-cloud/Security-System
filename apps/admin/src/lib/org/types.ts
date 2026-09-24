/** Organization portal domain types — separate from personal client portal. */

export type OrganizationType =
  | 'company'
  | 'mall'
  | 'estate'
  | 'property'
  | 'school'
  | 'hospital'
  | 'warehouse'
  | 'office'
  | 'campus'
  | 'construction'
  | 'other';

export type OrgMemberRole =
  | 'owner'
  | 'admin'
  | 'security_manager'
  | 'property_manager'
  | 'site_manager'
  | 'control_room'
  | 'reception'
  | 'tenant_manager'
  | 'security_officer'
  | 'maintenance'
  | 'read_only';

export type OrgIncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type OrgIncidentStatus =
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'DISPATCHED'
  | 'RESPONDING'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'CLOSED';

export type GateStatus = 'OPEN' | 'CLOSED' | 'LOCKED' | 'OFFLINE' | 'UNKNOWN';
export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';

export type OrgCameraGroup =
  | 'all'
  | 'entrances'
  | 'parking'
  | 'perimeter'
  | 'offices'
  | 'retail'
  | 'loading'
  | 'critical';

export type OrgCamera = {
  id: string;
  organizationId: string;
  siteId: string;
  siteName: string;
  name: string;
  location: string;
  group: Exclude<OrgCameraGroup, 'all'>;
  status: CameraStatus;
  quality: 'excellent' | 'good' | 'poor' | 'none';
  ptz: boolean;
  audio: boolean;
  offlineFor?: string;
  /** Visual preset for demo preview frames (not a live stream). */
  scene?:
    | 'entrance'
    | 'atrium'
    | 'parking'
    | 'loading'
    | 'perimeter'
    | 'lobby'
    | 'yard'
    | 'dock';
  /** Demo preview only — not a live device stream. */
  demo: true;
};

export type OrgAttentionKind =
  | 'incident'
  | 'panic'
  | 'camera_offline'
  | 'gate_open'
  | 'motion'
  | 'fire'
  | 'sensor'
  | 'device';

export type OrgAttentionItem = {
  id: string;
  organizationId: string;
  siteId: string;
  kind: OrgAttentionKind;
  severity: OrgIncidentSeverity;
  title: string;
  location: string;
  detail: string;
  cameraId?: string;
};

export type OrgActivityEvent = {
  id: string;
  organizationId: string;
  siteId: string;
  time: string;
  text: string;
  location: string;
};

export type OrgMapKind =
  | 'camera'
  | 'gate'
  | 'officer'
  | 'building'
  | 'vehicle'
  | 'incident'
  | 'fire'
  | 'assembly'
  | 'hose'
  | 'wiring'
  | 'sensor'
  | 'zone'
  | 'entrance';

export type OrgMapMarker = {
  id: string;
  organizationId: string;
  siteId: string;
  kind: OrgMapKind;
  label: string;
  x: number;
  y: number;
  tone: 'ok' | 'warn' | 'danger' | 'info';
  cameraId?: string;
};

export type OrgSearchHit = {
  id: string;
  kind: 'camera' | 'person' | 'vehicle' | 'incident' | 'site' | 'gate' | 'asset';
  label: string;
  detail: string;
  href: string;
};

export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  typeLabel: string;
  logoInitials: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  createdAt: string;
};

export type OrgSite = {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  siteType: string;
  status: 'NORMAL' | 'WARNING' | 'ACTIVE_INCIDENT' | 'OFFLINE';
  peopleOnSite: number;
  vehiclesOnSite: number;
  visitorsOnSite: number;
  officersOnDuty: number;
  officersRostered: number;
  camerasOnline: number;
  camerasTotal: number;
  openGates: number;
  activeAlerts: number;
};

export type OrgIncident = {
  id: string;
  organizationId: string;
  siteId: string;
  siteName: string;
  type: string;
  severity: OrgIncidentSeverity;
  status: OrgIncidentStatus;
  subject: string;
  location: string;
  createdAt: string;
  ageLabel: string;
};

export type OrgGate = {
  id: string;
  organizationId: string;
  siteId: string;
  siteName: string;
  name: string;
  status: GateStatus;
};

export type OrgPerson = {
  id: string;
  organizationId: string;
  name: string;
  role: string;
  siteName: string;
  status: 'on_site' | 'off_site' | 'visitor';
};

export type OrgMember = {
  userId: string;
  organizationId: string;
  role: OrgMemberRole;
  email: string;
  firstName: string;
  lastName: string;
};

export type OrgSession = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  memberships: OrgMember[];
  activeOrganizationId: string;
  activeSiteId: string | 'all';
  accessToken: string;
};

export type OrgDashboardKpis = {
  activeIncidents: number;
  peopleOnSite: number;
  vehiclesOnSite: number;
  visitors: number;
  openGates: number;
  officersOnDuty: number;
  officersRostered: number;
  camerasOnline: number;
  camerasTotal: number;
  activeAlerts: number;
};

export const ORG_TYPE_OPTIONS: { value: OrganizationType; label: string }[] = [
  { value: 'mall', label: 'Shopping mall / centre' },
  { value: 'company', label: 'Company / corporate' },
  { value: 'office', label: 'Office building / park' },
  { value: 'estate', label: 'Residential estate' },
  { value: 'property', label: 'Apartment / property complex' },
  { value: 'school', label: 'School / campus' },
  { value: 'hospital', label: 'Hospital / medical' },
  { value: 'warehouse', label: 'Warehouse / logistics' },
  { value: 'construction', label: 'Construction site' },
  { value: 'other', label: 'Other / multi-property' },
];
