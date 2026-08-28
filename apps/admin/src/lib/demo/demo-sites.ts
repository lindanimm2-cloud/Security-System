/** Seed data: mixed demo sites, clients, CCTV, and vehicles for control room + portal. */

export type DemoClientRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subscription: {
    planName: string;
    tierCode: string;
    status: string;
    memberId: string;
  };
};

export type DemoCamera = {
  id: string;
  name: string;
  locationLabel: string;
  channel: number;
  status: string;
  snapshotUrl: string | null;
  streamUrl: string;
  isLiveCapable: boolean;
  isInterior: boolean;
  placement: string;
};

export type DemoSensor = {
  id: string;
  name: string;
  zoneNumber: number;
  sensorType: string;
  status: string;
  locationLabel: string;
  isPerimeter: boolean;
  is24Hour: boolean;
  bypassed: boolean;
  cidCode: string;
  vendor: string;
};

export type DemoSurveillanceSite = {
  id: string;
  name: string;
  address: string;
  propertyType: string;
  alarmStatus: string;
  alarmLinked: boolean;
  camerasLinked: boolean;
  monitoringEnabled: boolean;
  shareInteriorCameras: boolean;
  privacy: {
    shareInteriorCameras: boolean;
    interiorUnlocked: boolean;
    unlockReason: string;
    unlockLabel: string;
    interiorCameraCount: number;
    privateInteriorCount: number;
  };
  panel: {
    panelVendor: string;
    panelModel: string;
    communicatorType: string;
    monitoringAccount: string;
    partitionLabel: string;
    protocol: string;
    region: string;
  };
  cameraCount: number;
  onlineCameras: number;
  sensorCount: number;
  alertSensors: number;
  openEvents: number;
  cameras: DemoCamera[];
  sensors: DemoSensor[];
  gateCode: string | null;
  accessNotes: string | null;
  keyHolder: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string;
    membershipNumber: string;
    plan: string;
    tier: string;
    subscriptionStatus: string;
    joinedAt: string;
  };
  linkedVehicles: {
    id: string;
    registration: string;
    make: string;
    model: string;
    color: string;
    year: number;
    trackerStatus: string;
    speed: number;
    lastSeen: string;
  }[];
  assignedFleet: {
    id: string;
    callSign: string;
    registration: string;
    vehicleType: string;
    teamName: string;
    status: string;
    crew: { name: string; role: string }[];
  }[];
  subscription: {
    plan: string;
    status: string;
    renewalDate: string;
    monthlyAmount: number;
    addons: string[];
  };
  /** Map pin */
  lat: number;
  lng: number;
  mapAlarm?: string;
};

function cam(
  id: string,
  name: string,
  locationLabel: string,
  channel: number,
  opts?: Partial<DemoCamera>,
): DemoCamera {
  return {
    id,
    name,
    locationLabel,
    channel,
    status: 'ONLINE',
    snapshotUrl: null,
    streamUrl: 'demo',
    isLiveCapable: true,
    isInterior: false,
    placement: 'EXTERIOR',
    ...opts,
  };
}

function sensor(
  id: string,
  name: string,
  zoneNumber: number,
  sensorType: string,
  locationLabel: string,
  opts?: Partial<DemoSensor>,
): DemoSensor {
  return {
    id,
    name,
    zoneNumber,
    sensorType,
    status: 'SECURE',
    locationLabel,
    isPerimeter: true,
    is24Hour: false,
    bypassed: false,
    cidCode: String(130 + zoneNumber),
    vendor: 'Paradox',
    ...opts,
  };
}

export const demoClients: DemoClientRecord[] = [
  {
    id: 'demo-user-client-demo-local',
    firstName: 'Nomsa',
    lastName: 'Client',
    email: 'client@demo.local',
    phone: '+27821234567',
    subscription: {
      planName: 'Family Protect',
      tierCode: 'FAMILY',
      status: 'ACTIVE',
      memberId: 'NX-MEM-1001',
    },
  },
  {
    id: 'demo-user-james-demo-local',
    firstName: 'James',
    lastName: 'Demo',
    email: 'james@demo.local',
    phone: '+27829876543',
    subscription: {
      planName: 'Personal Protect',
      tierCode: 'PERSONAL',
      status: 'PAST_DUE',
      memberId: 'NX-MEM-1002',
    },
  },
  {
    id: 'demo-user-priya-warehouse-local',
    firstName: 'Priya',
    lastName: 'Naidoo',
    email: 'priya@warehouse.local',
    phone: '+27831112201',
    subscription: {
      planName: 'Business Protect',
      tierCode: 'BUSINESS',
      status: 'ACTIVE',
      memberId: 'NX-MEM-2101',
    },
  },
  {
    id: 'demo-user-thabo-retail-local',
    firstName: 'Thabo',
    lastName: 'Retail',
    email: 'thabo@gateway.local',
    phone: '+27832223302',
    subscription: {
      planName: 'Business Protect',
      tierCode: 'BUSINESS',
      status: 'ACTIVE',
      memberId: 'NX-MEM-2102',
    },
  },
  {
    id: 'demo-user-lerato-farm-local',
    firstName: 'Lerato',
    lastName: 'Mokoena',
    email: 'lerato@hillcrest.local',
    phone: '+27834445503',
    subscription: {
      planName: 'Home Protect',
      tierCode: 'HOME',
      status: 'ACTIVE',
      memberId: 'NX-MEM-2103',
    },
  },
  {
    id: 'demo-user-asha-clinic-local',
    firstName: 'Asha',
    lastName: 'Patel',
    email: 'asha@ridgeclinic.local',
    phone: '+27835556604',
    subscription: {
      planName: 'Business Protect',
      tierCode: 'BUSINESS',
      status: 'TRIALING',
      memberId: 'NX-MEM-2104',
    },
  },
  {
    id: 'demo-user-sarah-guest-local',
    firstName: 'Sarah',
    lastName: 'Guest',
    email: 'sarah@morningside.local',
    phone: '+27836667705',
    subscription: {
      planName: 'Home Protect',
      tierCode: 'HOME',
      status: 'ACTIVE',
      memberId: 'NX-MEM-2105',
    },
  },
];

export const demoClientProfiles: Record<
  string,
  { firstName: string; lastName: string; phone: string; email: string; trackingEnabled: boolean }
> = Object.fromEntries(
  demoClients.map((c) => [
    c.id,
    {
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email,
      trackingEnabled: true,
    },
  ]),
);

export const demoProperties: {
  id: string;
  name: string;
  alarmStatus: string;
  alarmLinked: boolean;
}[] = [
  { id: 'demo-prop-1', name: 'Home — Umhlanga', alarmStatus: 'ARMED', alarmLinked: true },
  { id: 'demo-prop-2', name: 'Flat — Ballito', alarmStatus: 'DISARMED', alarmLinked: true },
  { id: 'demo-prop-3', name: 'Warehouse — Prospecton', alarmStatus: 'ARMED', alarmLinked: true },
  { id: 'demo-prop-4', name: 'Retail — Gateway', alarmStatus: 'TRIGGERED', alarmLinked: true },
  { id: 'demo-prop-5', name: 'Farmstead — Hillcrest', alarmStatus: 'ARMED', alarmLinked: true },
  { id: 'demo-prop-6', name: 'Clinic — Umhlanga Ridge', alarmStatus: 'ARMED_STAY', alarmLinked: true },
  { id: 'demo-prop-7', name: 'Guest house — Morningside', alarmStatus: 'DISARMED', alarmLinked: true },
];

const nowIso = () => new Date().toISOString();
const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

export const demoSurveillanceSites: DemoSurveillanceSite[] = [
  {
    id: 'demo-prop-1',
    name: 'Home — Umhlanga',
    address: '12 Lagoon Dr, Umhlanga',
    propertyType: 'RESIDENTIAL',
    alarmStatus: 'ARMED',
    alarmLinked: true,
    camerasLinked: true,
    monitoringEnabled: true,
    shareInteriorCameras: false,
    privacy: {
      shareInteriorCameras: false,
      interiorUnlocked: true,
      unlockReason: 'OWNER',
      unlockLabel: 'Owner view',
      interiorCameraCount: 1,
      privateInteriorCount: 0,
    },
    panel: {
      panelVendor: 'Paradox',
      panelModel: 'MG5050+',
      communicatorType: 'IP150',
      monitoringAccount: 'ZA-88421',
      partitionLabel: 'Partition 1',
      protocol: 'Contact ID',
      region: 'ZA',
    },
    cameraCount: 4,
    onlineCameras: 4,
    sensorCount: 8,
    alertSensors: 1,
    openEvents: 2,
    cameras: [
      cam('demo-cam-1', 'Front gate', 'Driveway', 1),
      cam('demo-cam-2', 'Garage', 'Side entrance', 2),
      cam('demo-cam-3', 'Pool & patio', 'Back garden', 3, { status: 'RECORDING' }),
      cam('demo-cam-4', 'Lounge', 'Interior', 4, { isInterior: true, placement: 'INTERIOR' }),
    ],
    sensors: [
      sensor('demo-sens-1', 'Front door', 1, 'DOOR', 'Main entrance'),
      sensor('demo-sens-2', 'Lounge window', 2, 'WINDOW', 'Living room'),
      sensor('demo-sens-3', 'Back gate PIR', 3, 'PIR', 'Rear garden', { status: 'ALERT' }),
      sensor('demo-sens-4', 'Garage side door', 4, 'DOOR', 'Side garage'),
    ],
    gateCode: '4411',
    accessNotes: 'Contact client before entry. Dog on premises.',
    keyHolder: 'Nomsa Client · +27 82 123 4567',
    owner: {
      id: 'demo-user-client-demo-local',
      name: 'Nomsa Client',
      email: 'client@demo.local',
      phone: '+27821234567',
      membershipNumber: 'NX-MEM-1001',
      plan: 'Family Protect',
      tier: 'FAMILY',
      subscriptionStatus: 'ACTIVE',
      joinedAt: '2023-04-10T08:00:00Z',
    },
    linkedVehicles: [
      {
        id: 'demo-veh-1',
        registration: 'ND 123-456',
        make: 'Toyota',
        model: 'Fortuner',
        color: 'White',
        year: 2022,
        trackerStatus: 'ONLINE',
        speed: 42,
        lastSeen: minsAgo(3),
      },
    ],
    assignedFleet: [
      {
        id: 'demo-fleet-1',
        callSign: 'Unit 101',
        registration: 'ND 4DS-101',
        vehicleType: 'ARMED_RESPONSE',
        teamName: 'Armed response',
        status: 'ON_DUTY',
        crew: [{ name: 'Sipho Ndlovu', role: 'DRIVER' }],
      },
    ],
    subscription: {
      plan: 'Family Protect',
      status: 'ACTIVE',
      renewalDate: '2027-04-10',
      monthlyAmount: 1250,
      addons: ['Home monitoring', 'Vehicle tracking', 'CCTV cloud storage'],
    },
    lat: -29.728,
    lng: 31.085,
    mapAlarm: 'ALARM_ACTIVE',
  },
  {
    id: 'demo-prop-2',
    name: 'Flat — Ballito',
    address: '8 Ocean View, Ballito',
    propertyType: 'APARTMENT',
    alarmStatus: 'DISARMED',
    alarmLinked: true,
    camerasLinked: true,
    monitoringEnabled: true,
    shareInteriorCameras: false,
    privacy: {
      shareInteriorCameras: false,
      interiorUnlocked: false,
      unlockReason: 'LOCKED',
      unlockLabel: 'Privacy lock',
      interiorCameraCount: 1,
      privateInteriorCount: 1,
    },
    panel: {
      panelVendor: 'Texecom',
      panelModel: 'Premier Elite 48',
      communicatorType: 'SmartCom',
      monitoringAccount: 'ZA-91002',
      partitionLabel: 'Flat A',
      protocol: 'SIA',
      region: 'ZA',
    },
    cameraCount: 3,
    onlineCameras: 3,
    sensorCount: 5,
    alertSensors: 0,
    openEvents: 0,
    cameras: [
      cam('demo-cam-21', 'Lobby entrance', 'Ground lobby', 1),
      cam('demo-cam-22', 'Balcony', 'Sea-facing', 2),
      cam('demo-cam-23', 'Living room', 'Interior', 3, {
        isInterior: true,
        placement: 'INTERIOR',
        status: 'ONLINE',
      }),
    ],
    sensors: [
      sensor('demo-sens-21', 'Front door', 1, 'DOOR', 'Flat entrance'),
      sensor('demo-sens-22', 'Balcony door', 2, 'DOOR', 'Balcony'),
      sensor('demo-sens-23', 'Smoke lounge', 3, 'SMOKE', 'Lounge', { is24Hour: true, isPerimeter: false }),
    ],
    gateCode: null,
    accessNotes: 'Buzz unit 804. Concierge on site until 20:00.',
    keyHolder: 'James Demo · +27 82 987 6543',
    owner: {
      id: 'demo-user-james-demo-local',
      name: 'James Demo',
      email: 'james@demo.local',
      phone: '+27829876543',
      membershipNumber: 'NX-MEM-1002',
      plan: 'Personal Protect',
      tier: 'PERSONAL',
      subscriptionStatus: 'ACTIVE',
      joinedAt: '2024-01-18T08:00:00Z',
    },
    linkedVehicles: [
      {
        id: 'demo-veh-2',
        registration: 'ND 882-441',
        make: 'Volkswagen',
        model: 'Polo',
        color: 'Silver',
        year: 2021,
        trackerStatus: 'ONLINE',
        speed: 0,
        lastSeen: minsAgo(12),
      },
    ],
    assignedFleet: [
      {
        id: 'demo-fleet-6',
        callSign: 'Bike 1',
        registration: 'ND 4DS-RR1',
        vehicleType: 'MOTORCYCLE',
        teamName: 'Rapid response',
        status: 'AVAILABLE',
        crew: [{ name: 'Aisha Khan', role: 'DRIVER' }],
      },
    ],
    subscription: {
      plan: 'Personal Protect',
      status: 'ACTIVE',
      renewalDate: '2026-12-01',
      monthlyAmount: 690,
      addons: ['Apartment CCTV', 'Panic'],
    },
    lat: -29.539,
    lng: 31.214,
    mapAlarm: 'ALARM_OK',
  },
  {
    id: 'demo-prop-3',
    name: 'Warehouse — Prospecton',
    address: '44 Industrial Rd, Prospecton',
    propertyType: 'COMMERCIAL',
    alarmStatus: 'ARMED',
    alarmLinked: true,
    camerasLinked: true,
    monitoringEnabled: true,
    shareInteriorCameras: true,
    privacy: {
      shareInteriorCameras: true,
      interiorUnlocked: true,
      unlockReason: 'POLICY',
      unlockLabel: 'Business monitoring',
      interiorCameraCount: 2,
      privateInteriorCount: 0,
    },
    panel: {
      panelVendor: 'DSC',
      panelModel: 'PowerSeries Neo',
      communicatorType: 'TL280',
      monitoringAccount: 'ZA-77210',
      partitionLabel: 'Yard + warehouse',
      protocol: 'Contact ID',
      region: 'ZA',
    },
    cameraCount: 6,
    onlineCameras: 4,
    sensorCount: 12,
    alertSensors: 0,
    openEvents: 0,
    cameras: [
      cam('demo-cam-31', 'Yard gate', 'Truck entrance', 1),
      cam('demo-cam-32', 'Loading bay A', 'Dock', 2, { status: 'RECORDING' }),
      cam('demo-cam-33', 'Loading bay B', 'Dock', 3, { status: 'OFFLINE' }),
      cam('demo-cam-34', 'Aisle 3', 'Interior racking', 4, {
        isInterior: true,
        placement: 'INTERIOR',
      }),
      cam('demo-cam-35', 'Office mezzanine', 'Interior', 5, {
        isInterior: true,
        placement: 'INTERIOR',
        status: 'OFFLINE',
      }),
      cam('demo-cam-36', 'Perimeter north', 'Fence line', 6),
    ],
    sensors: [
      sensor('demo-sens-31', 'Roller shutter 1', 1, 'DOOR', 'Bay A'),
      sensor('demo-sens-32', 'Roller shutter 2', 2, 'DOOR', 'Bay B'),
      sensor('demo-sens-33', 'Yard PIR', 3, 'PIR', 'North fence'),
      sensor('demo-sens-34', 'Server cage', 4, 'DOOR', 'IT cage', { is24Hour: true }),
    ],
    gateCode: '9088',
    accessNotes: 'Night guard on radio ch.4. Forklift traffic until 22:00.',
    keyHolder: 'Priya Naidoo · +27 83 111 2201',
    owner: {
      id: 'demo-user-priya-warehouse-local',
      name: 'Priya Naidoo',
      email: 'priya@warehouse.local',
      phone: '+27831112201',
      membershipNumber: 'NX-MEM-2101',
      plan: 'Business Protect',
      tier: 'BUSINESS',
      subscriptionStatus: 'ACTIVE',
      joinedAt: '2022-09-01T08:00:00Z',
    },
    linkedVehicles: [
      {
        id: 'demo-veh-3',
        registration: 'ND 441-778',
        make: 'Isuzu',
        model: 'D-Max',
        color: 'Blue',
        year: 2020,
        trackerStatus: 'ONLINE',
        speed: 0,
        lastSeen: minsAgo(25),
      },
      {
        id: 'demo-veh-4',
        registration: 'ND 556-902',
        make: 'Nissan',
        model: 'NV200',
        color: 'White',
        year: 2019,
        trackerStatus: 'ONLINE',
        speed: 34,
        lastSeen: minsAgo(4),
      },
    ],
    assignedFleet: [
      {
        id: 'demo-fleet-3',
        callSign: 'Patrol 2',
        registration: 'ND 4DS-P02',
        vehicleType: 'PATROL',
        teamName: 'Patrol',
        status: 'MAINTENANCE',
        crew: [],
      },
    ],
    subscription: {
      plan: 'Business Protect',
      status: 'ACTIVE',
      renewalDate: '2026-09-01',
      monthlyAmount: 4200,
      addons: ['Multi-cam cloud', 'Yard beam', 'After-hours guard'],
    },
    lat: -29.978,
    lng: 30.955,
    mapAlarm: 'ALARM_ACTIVE',
  },
  {
    id: 'demo-prop-4',
    name: 'Retail — Gateway',
    address: 'Gateway Theatre of Shopping, Umhlanga',
    propertyType: 'RETAIL',
    alarmStatus: 'TRIGGERED',
    alarmLinked: true,
    camerasLinked: true,
    monitoringEnabled: true,
    shareInteriorCameras: true,
    privacy: {
      shareInteriorCameras: true,
      interiorUnlocked: true,
      unlockReason: 'POLICY',
      unlockLabel: 'Retail ops',
      interiorCameraCount: 2,
      privateInteriorCount: 0,
    },
    panel: {
      panelVendor: 'Honeywell',
      panelModel: 'Vista-128BPT',
      communicatorType: 'GSM',
      monitoringAccount: 'ZA-55019',
      partitionLabel: 'Shop floor',
      protocol: 'Contact ID',
      region: 'ZA',
    },
    cameraCount: 5,
    onlineCameras: 5,
    sensorCount: 9,
    alertSensors: 2,
    openEvents: 1,
    cameras: [
      cam('demo-cam-41', 'Mall entrance', 'Shopfront', 1, { status: 'RECORDING' }),
      cam('demo-cam-42', 'Till line', 'POS', 2, { isInterior: true, placement: 'INTERIOR' }),
      cam('demo-cam-43', 'Stock room', 'Back of house', 3, {
        isInterior: true,
        placement: 'INTERIOR',
      }),
      cam('demo-cam-44', 'Service corridor', 'Staff passage', 4),
      cam('demo-cam-45', 'Loading alley', 'Rear service', 5),
    ],
    sensors: [
      sensor('demo-sens-41', 'Shopfront break-glass', 1, 'GLASS', 'Facade', { status: 'ALERT' }),
      sensor('demo-sens-42', 'Stock door', 2, 'DOOR', 'Stock room', { status: 'ALERT' }),
      sensor('demo-sens-43', 'Safe vibration', 3, 'SHOCK', 'Office safe', { is24Hour: true }),
    ],
    gateCode: '2210',
    accessNotes: 'Mall security desk notified. Use service entrance C.',
    keyHolder: 'Thabo Retail · +27 83 222 3302',
    owner: {
      id: 'demo-user-thabo-retail-local',
      name: 'Thabo Retail',
      email: 'thabo@gateway.local',
      phone: '+27832223302',
      membershipNumber: 'NX-MEM-2102',
      plan: 'Business Protect',
      tier: 'BUSINESS',
      subscriptionStatus: 'ACTIVE',
      joinedAt: '2023-11-12T08:00:00Z',
    },
    linkedVehicles: [
      {
        id: 'demo-veh-5',
        registration: 'ND 774-110',
        make: 'Mercedes-Benz',
        model: 'Sprinter',
        color: 'White',
        year: 2023,
        trackerStatus: 'ONLINE',
        speed: 0,
        lastSeen: minsAgo(40),
      },
    ],
    assignedFleet: [
      {
        id: 'demo-fleet-1',
        callSign: 'Unit 101',
        registration: 'ND 4DS-101',
        vehicleType: 'ARMED_RESPONSE',
        teamName: 'Armed response',
        status: 'EN_ROUTE',
        crew: [{ name: 'Sipho Ndlovu', role: 'DRIVER' }],
      },
    ],
    subscription: {
      plan: 'Business Protect',
      status: 'ACTIVE',
      renewalDate: '2026-11-12',
      monthlyAmount: 3100,
      addons: ['Retail CCTV wall', 'Hold-up button', 'Mall liaison'],
    },
    lat: -29.726,
    lng: 31.067,
    mapAlarm: 'ALARM_TRIGGERED',
  },
  {
    id: 'demo-prop-5',
    name: 'Farmstead — Hillcrest',
    address: 'Inanda Rd, Hillcrest',
    propertyType: 'RURAL',
    alarmStatus: 'ARMED',
    alarmLinked: true,
    camerasLinked: true,
    monitoringEnabled: true,
    shareInteriorCameras: false,
    privacy: {
      shareInteriorCameras: false,
      interiorUnlocked: true,
      unlockReason: 'OWNER',
      unlockLabel: 'Owner view',
      interiorCameraCount: 1,
      privateInteriorCount: 0,
    },
    panel: {
      panelVendor: 'IDS',
      panelModel: 'X64',
      communicatorType: 'Radio',
      monitoringAccount: 'ZA-33088',
      partitionLabel: 'Homestead',
      protocol: 'Contact ID',
      region: 'ZA',
    },
    cameraCount: 4,
    onlineCameras: 3,
    sensorCount: 7,
    alertSensors: 0,
    openEvents: 0,
    cameras: [
      cam('demo-cam-51', 'Main gate', 'Dirt approach', 1),
      cam('demo-cam-52', 'Barn yard', 'Outbuildings', 2),
      cam('demo-cam-53', 'Borehole', 'Water tank', 3, { status: 'OFFLINE' }),
      cam('demo-cam-54', 'Kitchen', 'Interior', 4, { isInterior: true, placement: 'INTERIOR' }),
    ],
    sensors: [
      sensor('demo-sens-51', 'Gate contact', 1, 'DOOR', 'Main gate'),
      sensor('demo-sens-52', 'Barn PIR', 2, 'PIR', 'Barn'),
      sensor('demo-sens-53', 'Generator shed', 3, 'DOOR', 'Power shed'),
    ],
    gateCode: '7781',
    accessNotes: 'Livestock on roads after dark. Call before opening boom.',
    keyHolder: 'Lerato Mokoena · +27 83 444 5503',
    owner: {
      id: 'demo-user-lerato-farm-local',
      name: 'Lerato Mokoena',
      email: 'lerato@hillcrest.local',
      phone: '+27834445503',
      membershipNumber: 'NX-MEM-2103',
      plan: 'Home Protect',
      tier: 'HOME',
      subscriptionStatus: 'ACTIVE',
      joinedAt: '2021-06-20T08:00:00Z',
    },
    linkedVehicles: [
      {
        id: 'demo-veh-6',
        registration: 'NP 209-334',
        make: 'Toyota',
        model: 'Hilux',
        color: 'Grey',
        year: 2018,
        trackerStatus: 'ONLINE',
        speed: 18,
        lastSeen: minsAgo(7),
      },
    ],
    assignedFleet: [
      {
        id: 'demo-fleet-7',
        callSign: 'Cover 1',
        registration: 'ND 4DS-UM1',
        vehicleType: 'UNMARKED',
        teamName: 'Tactical',
        status: 'AVAILABLE',
        crew: [{ name: 'Fatima Essop', role: 'DRIVER' }],
      },
    ],
    subscription: {
      plan: 'Home Protect',
      status: 'ACTIVE',
      renewalDate: '2026-06-20',
      monthlyAmount: 980,
      addons: ['Rural radio link', 'Gate cam'],
    },
    lat: -29.78,
    lng: 30.762,
    mapAlarm: 'ALARM_ACTIVE',
  },
  {
    id: 'demo-prop-6',
    name: 'Clinic — Umhlanga Ridge',
    address: 'Ridgeside Office Park, Umhlanga',
    propertyType: 'OFFICE',
    alarmStatus: 'ARMED_STAY',
    alarmLinked: true,
    camerasLinked: true,
    monitoringEnabled: true,
    shareInteriorCameras: false,
    privacy: {
      shareInteriorCameras: false,
      interiorUnlocked: false,
      unlockReason: 'HIPAA',
      unlockLabel: 'Patient privacy',
      interiorCameraCount: 2,
      privateInteriorCount: 2,
    },
    panel: {
      panelVendor: 'Ajax',
      panelModel: 'Hub 2 Plus',
      communicatorType: 'Ethernet',
      monitoringAccount: 'ZA-66140',
      partitionLabel: 'Practice',
      protocol: 'SIA',
      region: 'ZA',
    },
    cameraCount: 4,
    onlineCameras: 4,
    sensorCount: 6,
    alertSensors: 0,
    openEvents: 0,
    cameras: [
      cam('demo-cam-61', 'Reception', 'Lobby', 1),
      cam('demo-cam-62', 'Parking bay', 'Basement P2', 2),
      cam('demo-cam-63', 'Pharmacy hatch', 'Dispensary', 3, {
        isInterior: true,
        placement: 'INTERIOR',
      }),
      cam('demo-cam-64', 'Consulting corridor', 'Interior', 4, {
        isInterior: true,
        placement: 'INTERIOR',
        status: 'RECORDING',
      }),
    ],
    sensors: [
      sensor('demo-sens-61', 'Glass entrance', 1, 'GLASS', 'Lobby'),
      sensor('demo-sens-62', 'Drug cupboard', 2, 'DOOR', 'Pharmacy', { is24Hour: true }),
      sensor('demo-sens-63', 'Server room', 3, 'DOOR', 'IT closet', { is24Hour: true }),
    ],
    gateCode: '3344',
    accessNotes: 'After-hours: medical panic only. No interior unlock without doctor.',
    keyHolder: 'Dr Asha Patel · +27 83 555 6604',
    owner: {
      id: 'demo-user-asha-clinic-local',
      name: 'Asha Patel',
      email: 'asha@ridgeclinic.local',
      phone: '+27835556604',
      membershipNumber: 'NX-MEM-2104',
      plan: 'Business Protect',
      tier: 'BUSINESS',
      subscriptionStatus: 'TRIALING',
      joinedAt: '2026-07-01T08:00:00Z',
    },
    linkedVehicles: [
      {
        id: 'demo-veh-7',
        registration: 'ND 901-220',
        make: 'BMW',
        model: 'X3',
        color: 'Black',
        year: 2024,
        trackerStatus: 'ONLINE',
        speed: 0,
        lastSeen: minsAgo(55),
      },
    ],
    assignedFleet: [
      {
        id: 'demo-fleet-2',
        callSign: 'Medic 1',
        registration: 'ND 4DS-M01',
        vehicleType: 'MEDICAL',
        teamName: 'Medical',
        status: 'ON_DUTY',
        crew: [{ name: 'Andile Paramedic', role: 'DRIVER' }],
      },
    ],
    subscription: {
      plan: 'Business Protect',
      status: 'TRIALING',
      renewalDate: '2026-10-01',
      monthlyAmount: 2600,
      addons: ['Medical panic', 'Pharmacy cage'],
    },
    lat: -29.735,
    lng: 31.055,
    mapAlarm: 'ALARM_STAY',
  },
  {
    id: 'demo-prop-7',
    name: 'Guest house — Morningside',
    address: '19 Ridge Rd, Morningside',
    propertyType: 'HOSPITALITY',
    alarmStatus: 'DISARMED',
    alarmLinked: true,
    camerasLinked: true,
    monitoringEnabled: true,
    shareInteriorCameras: false,
    privacy: {
      shareInteriorCameras: false,
      interiorUnlocked: false,
      unlockReason: 'GUEST',
      unlockLabel: 'Guest privacy',
      interiorCameraCount: 0,
      privateInteriorCount: 0,
    },
    panel: {
      panelVendor: 'Paradox',
      panelModel: 'SP6000',
      communicatorType: 'IP150',
      monitoringAccount: 'ZA-41990',
      partitionLabel: 'Common areas',
      protocol: 'Contact ID',
      region: 'ZA',
    },
    cameraCount: 3,
    onlineCameras: 2,
    sensorCount: 4,
    alertSensors: 0,
    openEvents: 0,
    cameras: [
      cam('demo-cam-71', 'Street entrance', 'Front porch', 1),
      cam('demo-cam-72', 'Parking', 'Side lot', 2, { status: 'OFFLINE' }),
      cam('demo-cam-73', 'Garden pool', 'Backyard', 3, { status: 'RECORDING' }),
    ],
    sensors: [
      sensor('demo-sens-71', 'Front door', 1, 'DOOR', 'Reception'),
      sensor('demo-sens-72', 'Pool gate', 2, 'DOOR', 'Garden'),
      sensor('demo-sens-73', 'Smoke hall', 3, 'SMOKE', 'Upstairs hall', {
        is24Hour: true,
        isPerimeter: false,
      }),
    ],
    gateCode: '5566',
    accessNotes: 'Guests check in until 21:00. Quiet hours after 22:00.',
    keyHolder: 'Sarah Guest · +27 83 666 7705',
    owner: {
      id: 'demo-user-sarah-guest-local',
      name: 'Sarah Guest',
      email: 'sarah@morningside.local',
      phone: '+27836667705',
      membershipNumber: 'NX-MEM-2105',
      plan: 'Home Protect',
      tier: 'HOME',
      subscriptionStatus: 'ACTIVE',
      joinedAt: '2025-02-14T08:00:00Z',
    },
    linkedVehicles: [],
    assignedFleet: [
      {
        id: 'demo-fleet-5',
        callSign: 'TAC 1',
        registration: 'ND 4DS-TAC',
        vehicleType: 'TACTICAL',
        teamName: 'Tactical',
        status: 'AVAILABLE',
        crew: [{ name: 'Zanele Khumalo', role: 'DRIVER' }],
      },
    ],
    subscription: {
      plan: 'Home Protect',
      status: 'ACTIVE',
      renewalDate: '2027-02-14',
      monthlyAmount: 850,
      addons: ['Hospitality perimeter'],
    },
    lat: -29.832,
    lng: 31.012,
    mapAlarm: 'ALARM_OK',
  },
];

export type DemoVehicleFeed = {
  vehicleId: string;
  registration: string;
  label: string;
  cameras: DemoCamera[];
};

export const demoVehicleCameraFeeds: DemoVehicleFeed[] = [
  {
    vehicleId: 'demo-veh-1',
    registration: 'ND 123-456',
    label: 'Toyota Fortuner',
    cameras: [
      cam('demo-vcam-1', 'Dash forward', 'Windscreen', 1),
      cam('demo-vcam-2', 'Cabin', 'Interior', 2, { isInterior: true, placement: 'INTERIOR' }),
      cam('demo-vcam-3', 'Rear view', 'Tailgate cam', 3, { status: 'RECORDING' }),
    ],
  },
  {
    vehicleId: 'demo-veh-2',
    registration: 'ND 882-441',
    label: 'VW Polo',
    cameras: [cam('demo-vcam-21', 'Dash forward', 'Windscreen', 1)],
  },
  {
    vehicleId: 'demo-veh-3',
    registration: 'ND 441-778',
    label: 'Isuzu D-Max',
    cameras: [
      cam('demo-vcam-31', 'Dash forward', 'Windscreen', 1),
      cam('demo-vcam-32', 'Load bay', 'Bakkie bed', 2),
    ],
  },
  {
    vehicleId: 'demo-veh-4',
    registration: 'ND 556-902',
    label: 'Nissan NV200',
    cameras: [
      cam('demo-vcam-41', 'Dash forward', 'Windscreen', 1, { status: 'RECORDING' }),
      cam('demo-vcam-42', 'Cargo', 'Rear cabin', 2, { isInterior: true, placement: 'INTERIOR' }),
    ],
  },
  {
    vehicleId: 'demo-veh-5',
    registration: 'ND 774-110',
    label: 'Sprinter delivery',
    cameras: [
      cam('demo-vcam-51', 'Dash forward', 'Windscreen', 1),
      cam('demo-vcam-52', 'Side door', 'Sliding door', 2),
    ],
  },
  {
    vehicleId: 'demo-veh-6',
    registration: 'NP 209-334',
    label: 'Hilux farm bakkie',
    cameras: [cam('demo-vcam-61', 'Dash forward', 'Windscreen', 1)],
  },
  {
    vehicleId: 'demo-veh-7',
    registration: 'ND 901-220',
    label: 'BMW X3',
    cameras: [
      cam('demo-vcam-71', 'Dash forward', 'Windscreen', 1),
      cam('demo-vcam-72', 'Cabin', 'Interior', 2, { isInterior: true, placement: 'INTERIOR' }),
    ],
  },
];

export type DemoClientVehicle = {
  id: string;
  registration: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  color: string;
  vin: string;
  trackerLinked: boolean;
  theftRecovery: boolean;
  immobiliserOn: boolean;
  insuranceInfo: string;
  ownerName: string;
  ownerId: string;
  lat: number;
  lng: number;
  speed: number;
  trackerStatus: string;
};

export const demoClientVehicles: DemoClientVehicle[] = [
  {
    id: 'demo-veh-1',
    registration: 'ND 123-456',
    make: 'Toyota',
    model: 'Fortuner',
    variant: 'GD-6',
    year: 2022,
    color: 'White',
    vin: 'JTMDN123456789012',
    trackerLinked: true,
    theftRecovery: true,
    immobiliserOn: false,
    insuranceInfo: 'Santam comprehensive',
    ownerName: 'Nomsa Client',
    ownerId: 'demo-user-client-demo-local',
    lat: -29.81,
    lng: 31.04,
    speed: 68,
    trackerStatus: 'ONLINE',
  },
  {
    id: 'demo-veh-2',
    registration: 'ND 882-441',
    make: 'Volkswagen',
    model: 'Polo',
    year: 2021,
    color: 'Silver',
    vin: 'WVWZZZ6RZHY123456',
    trackerLinked: true,
    theftRecovery: false,
    immobiliserOn: false,
    insuranceInfo: 'OUTsurance',
    ownerName: 'James Demo',
    ownerId: 'demo-user-james-demo-local',
    lat: -29.54,
    lng: 31.21,
    speed: 0,
    trackerStatus: 'ONLINE',
  },
  {
    id: 'demo-veh-3',
    registration: 'ND 441-778',
    make: 'Isuzu',
    model: 'D-Max',
    year: 2020,
    color: 'Blue',
    vin: 'MPATFS86JKT123456',
    trackerLinked: true,
    theftRecovery: false,
    immobiliserOn: false,
    insuranceInfo: 'Company fleet',
    ownerName: 'Priya Naidoo',
    ownerId: 'demo-user-priya-warehouse-local',
    lat: -29.979,
    lng: 30.954,
    speed: 0,
    trackerStatus: 'ONLINE',
  },
  {
    id: 'demo-veh-4',
    registration: 'ND 556-902',
    make: 'Nissan',
    model: 'NV200',
    year: 2019,
    color: 'White',
    vin: 'SJNFBAF0U1U123456',
    trackerLinked: true,
    theftRecovery: false,
    immobiliserOn: false,
    insuranceInfo: 'Company fleet',
    ownerName: 'Priya Naidoo',
    ownerId: 'demo-user-priya-warehouse-local',
    lat: -29.92,
    lng: 30.98,
    speed: 34,
    trackerStatus: 'ONLINE',
  },
  {
    id: 'demo-veh-5',
    registration: 'ND 774-110',
    make: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2023,
    color: 'White',
    vin: 'WDB9066331N123456',
    trackerLinked: true,
    theftRecovery: false,
    immobiliserOn: true,
    insuranceInfo: 'Retail logistics',
    ownerName: 'Thabo Retail',
    ownerId: 'demo-user-thabo-retail-local',
    lat: -29.73,
    lng: 31.06,
    speed: 0,
    trackerStatus: 'ONLINE',
  },
  {
    id: 'demo-veh-6',
    registration: 'NP 209-334',
    make: 'Toyota',
    model: 'Hilux',
    year: 2018,
    color: 'Grey',
    vin: 'AHTCB8CD603123456',
    trackerLinked: true,
    theftRecovery: false,
    immobiliserOn: false,
    insuranceInfo: 'Farm cover',
    ownerName: 'Lerato Mokoena',
    ownerId: 'demo-user-lerato-farm-local',
    lat: -29.775,
    lng: 30.77,
    speed: 18,
    trackerStatus: 'ONLINE',
  },
  {
    id: 'demo-veh-7',
    registration: 'ND 901-220',
    make: 'BMW',
    model: 'X3',
    year: 2024,
    color: 'Black',
    vin: 'WBAWX91000L123456',
    trackerLinked: true,
    theftRecovery: false,
    immobiliserOn: false,
    insuranceInfo: 'Discovery Insure',
    ownerName: 'Asha Patel',
    ownerId: 'demo-user-asha-clinic-local',
    lat: -29.736,
    lng: 31.052,
    speed: 0,
    trackerStatus: 'ONLINE',
  },
];

export function demoSiteOpenEvents(siteId: string) {
  if (siteId === 'demo-prop-1') {
    return [
      {
        id: 'demo-ev-1',
        title: 'Motion detected — front gate',
        type: 'MOTION',
        severity: 'HIGH',
        status: 'OPEN',
        triggeredAt: minsAgo(8),
      },
      {
        id: 'demo-ev-2',
        title: 'PIR alert — back gate',
        type: 'INTRUSION',
        severity: 'CRITICAL',
        status: 'OPEN',
        triggeredAt: minsAgo(3),
      },
    ];
  }
  if (siteId === 'demo-prop-4') {
    return [
      {
        id: 'demo-ev-41',
        title: 'Break-glass — shopfront',
        type: 'INTRUSION',
        severity: 'CRITICAL',
        status: 'OPEN',
        triggeredAt: minsAgo(6),
      },
    ];
  }
  return [];
}

export function syncDemoPropertyAlarm(id: string, status: string) {
  const prop = demoProperties.find((p) => p.id === id);
  if (prop) prop.alarmStatus = status;
  const site = demoSurveillanceSites.find((s) => s.id === id);
  if (site) site.alarmStatus = status;
}

/** Lightweight map clients derived from site owners (unique). */
export function demoMapClients() {
  const seen = new Set<string>();
  return demoSurveillanceSites
    .filter((s) => {
      if (seen.has(s.owner.id)) return false;
      seen.add(s.owner.id);
      return true;
    })
    .map((s, idx) => ({
      id: s.owner.id,
      name: s.owner.name,
      lat: s.lat + (idx % 2 === 0 ? 0.002 : -0.0015),
      lng: s.lng + (idx % 3 === 0 ? 0.001 : -0.001),
      clientType: s.owner.tier === 'FAMILY' || s.owner.tier === 'BUSINESS' ? 'VIP' : 'STANDARD',
      membershipNumber: s.owner.membershipNumber,
      tierCode: s.owner.tier,
      planName: s.owner.plan,
      subscriptionStatus: s.owner.subscriptionStatus,
      addons: s.subscription.addons.slice(0, 2).map((a) => a.toUpperCase().replace(/\s+/g, '_')),
      phone: s.owner.phone,
      emergencyContacts: [{ name: 'Key holder', phone: s.owner.phone }],
      status: 'ONLINE',
      batteryPct: 70 + ((idx * 7) % 25),
      updatedAt: nowIso(),
    }));
}

export function demoMapProperties() {
  return demoSurveillanceSites.map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    propertyType: s.mapAlarm ?? 'ALARM_OK',
    name: s.name,
    address: s.address,
    alarmStatus: s.alarmStatus,
    owner: s.owner.name,
  }));
}

export function demoMapVehicles() {
  return demoClientVehicles.map((v) => ({
    id: v.id,
    lat: v.lat,
    lng: v.lng,
    vehicleType: v.theftRecovery ? 'STOLEN' : 'CLIENT',
    registration: v.registration,
    make: v.make,
    model: v.model,
    owner: v.ownerName,
    trackerStatus: v.trackerStatus,
    speed: v.speed,
    updatedAt: nowIso(),
  }));
}
