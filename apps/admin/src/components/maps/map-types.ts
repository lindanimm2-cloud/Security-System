export type ClientType =
  | 'STANDARD'
  | 'FAMILY_MEMBER'
  | 'CHILD'
  | 'ELDERLY'
  | 'VIP'
  | 'MEDICAL';

export type OfficerType =
  | 'ARMED_RESPONSE'
  | 'UNDERCOVER'
  | 'K9'
  | 'SUPERVISOR'
  | 'TACTICAL'
  | 'MEDICAL'
  | 'OFF_DUTY';

export type VehicleType =
  | 'CLIENT'
  | 'STOLEN'
  | 'ARMED_RESPONSE'
  | 'UNDERCOVER'
  | 'PATROL'
  | 'MOTORCYCLE'
  | 'MEDICAL'
  | 'TOW';

export type PropertyType =
  | 'REGISTERED_HOME'
  | 'ALARM_ACTIVE'
  | 'CCTV'
  | 'PANIC_EVENT'
  | 'GUARDED_ESTATE';

export type IncidentCategory =
  | 'PANIC'
  | 'SILENT_PANIC'
  | 'THEFT_RECOVERY'
  | 'MEDICAL'
  | 'FIRE'
  | 'INTRUSION'
  | 'ESCORT'
  | 'WELLNESS'
  | 'SUSPICIOUS'
  | 'COMMUNITY';

export type MapClient = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  clientType: ClientType;
  membershipNumber?: string | null;
  tierCode?: string | null;
  planName?: string | null;
  subscriptionStatus?: string | null;
  addons?: string[];
  validUntil?: string | null;
  phone?: string | null;
  emergencyContacts: { name: string; phone: string }[];
  medicalAlerts?: string | null;
  status: string;
  batteryPct: number;
  updatedAt: string | null;
};

export type VehicleCrewMember = {
  officerId: string;
  name: string;
  role: string;
  status?: string;
  zone?: string | null;
};

export type OfficerVehicleAssignment = {
  id: string;
  callSign: string;
  registration: string;
  role: string;
};

export type MapOfficer = {
  id: string;
  userId?: string | null;
  name: string;
  lat: number;
  lng: number;
  officerType: OfficerType;
  unitNumber: string;
  status: string;
  assignment?: string | null;
  eta?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  zone?: string | null;
  vehicle?: OfficerVehicleAssignment | null;
  crewMates?: VehicleCrewMember[];
};

export type MapFleetVehicle = {
  id: string;
  lat: number;
  lng: number;
  vehicleType: string;
  registration: string;
  callSign: string;
  make: string;
  model: string;
  color?: string | null;
  status: string;
  trackerStatus: string;
  speed: number;
  crew: VehicleCrewMember[];
  crewCount: number;
  isCompanyFleet: true;
  updatedAt: string | null;
};

export type MapVehicle = {
  id: string;
  lat: number;
  lng: number;
  vehicleType: VehicleType;
  registration: string;
  make: string;
  model: string;
  color?: string | null;
  owner: string;
  trackerStatus: string;
  speed: number;
  updatedAt: string | null;
};

export type MapProperty = {
  id: string;
  lat: number;
  lng: number;
  propertyType: PropertyType;
  name: string;
  address: string;
  alarmStatus: string;
  owner: string;
};

export type MapIncident = {
  id: string;
  category: IncidentCategory;
  type: string;
  priority: string;
  status: string;
  name: string;
  clientUserId?: string;
  clientPhone?: string | null;
  lat: number;
  lng: number;
  address: string | null;
  isSilent: boolean;
  createdAt: string;
  assignedOfficer?: string | null;
  nearestUnitKm?: number | null;
  nearestUnitEta?: string | null;
  trail: { lat: number; lng: number }[];
};

export type MapCommandData = {
  center: { lat: number; lng: number };
  clients: MapClient[];
  officers: MapOfficer[];
  vehicles: MapVehicle[];
  fleet?: MapFleetVehicle[];
  properties: MapProperty[];
  incidents: MapIncident[];
};

export type MarkerVisibility = {
  clients: boolean;
  officers: boolean;
  vehicles: boolean;
  fleet: boolean;
  incidents: boolean;
  properties: boolean;
  trails: boolean;
};

export const DEFAULT_VISIBILITY: MarkerVisibility = {
  clients: true,
  officers: true,
  vehicles: true,
  fleet: true,
  incidents: true,
  properties: true,
  trails: true,
};

export type NotificationCategory =
  | 'PANIC'
  | 'SILENT_PANIC'
  | 'THEFT_RECOVERY'
  | 'OFFICER'
  | 'VEHICLE'
  | 'ALARM'
  | 'MEDICAL'
  | 'FAMILY'
  | 'SYSTEM'
  | 'BILLING';

export type ControlRoomNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: string;
  link?: string | null;
  entityType?: 'incident' | 'vehicle' | 'client' | 'property' | null;
  entityId?: string | null;
};
