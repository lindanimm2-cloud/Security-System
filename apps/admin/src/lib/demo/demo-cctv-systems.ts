/** Demo CCTV kit registry — HiLook / Dahua / Pro View AHD style installs. */

export type DemoCctvCamera = {
  id: string;
  name: string;
  locationLabel: string;
  channel: number;
  serialNumber: string | null;
  model: string | null;
  resolution: string | null;
  placement: 'EXTERIOR' | 'INTERIOR';
  status: string;
  vendor: string | null;
};

export type DemoCctvSystem = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  kitSku: string | null;
  supplier: string | null;
  recorderType: string;
  channelCount: number;
  connectivity: string;
  recorderSerial: string | null;
  recorderIp: string | null;
  cloudId: string | null;
  hddInstalled: boolean;
  hddSerial: string | null;
  hddCapacityGb: number | null;
  firmware: string | null;
  mobileAppEnabled: boolean;
  techNotes: string | null;
  status: string;
  installedAt: string | null;
  createdAt: string;
  updatedAt: string;
  property: {
    id: string;
    name: string;
    address: string;
    propertyType: string;
    client: { id: string; name: string; email: string } | null;
  };
  cameras: DemoCctvCamera[];
};

export const DEMO_CCTV_PRESETS = [
  {
    id: 'hilook-4ch',
    label: 'HiLook 4-Channel Analog Kit',
    brand: 'HiLook',
    model: '4 Channel CCTV Kit',
    kitSku: 'HILOOK-4CH',
    supplier: 'Makro / Hikvision channel',
    recorderType: 'DVR',
    channelCount: 4,
    connectivity: 'ANALOG',
    resolution: '2MP',
    hddInstalled: false,
    mobileAppEnabled: true,
    cameraLabels: ['Front entrance', 'Side alley', 'Parking', 'Rear yard'],
  },
  {
    id: 'dahua-8ch',
    label: 'Dahua 2MP Bullet 8-Channel Kit',
    brand: 'Dahua',
    model: '2Mp Bullet 8Ch Full Kit',
    kitSku: 'DAHUA-2MP-8CH',
    supplier: 'Makro',
    recorderType: 'NVR',
    channelCount: 8,
    connectivity: 'LAN',
    resolution: '2MP',
    hddInstalled: false,
    mobileAppEnabled: true,
    cameraLabels: [
      'Entrance',
      'Parking A',
      'Parking B',
      'Loading bay',
      'Corridor',
      'Till area',
      'Stock room',
      'Perimeter rear',
    ],
  },
  {
    id: 'proview-ahd-4ch',
    label: 'Pro View 4-Channel AHD Kit',
    brand: 'Pro View',
    model: '4 CHANNEL AHD CCTV KIT',
    kitSku: 'PROVIEW-AHD-4',
    supplier: 'Big Brother Security Wholesalers',
    recorderType: 'DVR',
    channelCount: 4,
    connectivity: 'AHD',
    resolution: 'AHD',
    hddInstalled: false,
    mobileAppEnabled: true,
    cameraLabels: ['Front gate', 'Driveway', 'Backyard', 'Garage'],
  },
] as const;

export const DEMO_SITE_TYPES = [
  { value: 'HOUSE', label: 'House' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'TOWNHOUSE', label: 'Townhouse' },
  { value: 'ESTATE', label: 'Estate' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'STORE', label: 'Store' },
  { value: 'MALL', label: 'Mall' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'BRANCH', label: 'Branch' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
] as const;

const now = new Date().toISOString();

export let demoCctvSystems: DemoCctvSystem[] = [
  {
    id: 'demo-cctv-hilook-store',
    name: 'HiLook 4-Channel Analog Kit',
    brand: 'HiLook',
    model: '4 Channel CCTV Kit',
    kitSku: 'HILOOK-4CH',
    supplier: 'Makro',
    recorderType: 'DVR',
    channelCount: 4,
    connectivity: 'ANALOG',
    recorderSerial: 'HL-DVR-4CH-88421',
    recorderIp: '192.168.1.108',
    cloudId: 'HL-P2P-5521',
    hddInstalled: true,
    hddSerial: 'WD-BLUE-1TB-4412',
    hddCapacityGb: 1000,
    firmware: 'V4.30.100',
    mobileAppEnabled: true,
    techNotes: '4-way power splitter in ceiling void above till. Mobile viewing via HiLook app.',
    status: 'ONLINE',
    installedAt: now,
    createdAt: now,
    updatedAt: now,
    property: {
      id: 'demo-site-retail-gateway',
      name: 'Gateway Mall — Shop 214',
      address: '1 Palm Blvd, Umhlanga Rocks',
      propertyType: 'STORE',
      client: {
        id: 'demo-user-client-demo-local',
        name: 'Nomsa Client',
        email: 'client@demo.local',
      },
    },
    cameras: [
      {
        id: 'demo-cctv-hl-cam-1',
        name: 'Front entrance',
        locationLabel: 'Shop entrance',
        channel: 1,
        serialNumber: 'HL-CAM-1001',
        model: 'Bullet 2MP',
        resolution: '2MP',
        placement: 'EXTERIOR',
        status: 'ONLINE',
        vendor: 'HiLook',
      },
      {
        id: 'demo-cctv-hl-cam-2',
        name: 'Side alley',
        locationLabel: 'Service corridor',
        channel: 2,
        serialNumber: 'HL-CAM-1002',
        model: 'Bullet 2MP',
        resolution: '2MP',
        placement: 'EXTERIOR',
        status: 'ONLINE',
        vendor: 'HiLook',
      },
      {
        id: 'demo-cctv-hl-cam-3',
        name: 'Parking',
        locationLabel: 'Customer parking',
        channel: 3,
        serialNumber: 'HL-CAM-1003',
        model: 'Bullet 2MP',
        resolution: '2MP',
        placement: 'EXTERIOR',
        status: 'ONLINE',
        vendor: 'HiLook',
      },
      {
        id: 'demo-cctv-hl-cam-4',
        name: 'Till area',
        locationLabel: 'POS counter',
        channel: 4,
        serialNumber: 'HL-CAM-1004',
        model: 'Bullet 2MP',
        resolution: '2MP',
        placement: 'INTERIOR',
        status: 'ONLINE',
        vendor: 'HiLook',
      },
    ],
  },
  {
    id: 'demo-cctv-dahua-mall',
    name: 'Dahua 2Mp Bullet 8Ch Full Kit',
    brand: 'Dahua',
    model: '2Mp Bullet 8Ch Full Kit',
    kitSku: 'DAHUA-2MP-8CH',
    supplier: 'Makro',
    recorderType: 'NVR',
    channelCount: 8,
    connectivity: 'LAN',
    recorderSerial: 'DH-NVR-8CH-22019',
    recorderIp: '10.20.30.15',
    cloudId: 'DH-CLOUD-99102',
    hddInstalled: false,
    hddSerial: null,
    hddCapacityGb: null,
    firmware: 'V4.001.0000000.5',
    mobileAppEnabled: true,
    techNotes: 'Kit shipped without HDD — tech to fit 2TB before go-live. LAN runs to IDF closet.',
    status: 'COMMISSIONING',
    installedAt: null,
    createdAt: now,
    updatedAt: now,
    property: {
      id: 'demo-site-mall-gateway',
      name: 'Gateway Mall common area',
      address: '1 Palm Blvd, Umhlanga Rocks',
      propertyType: 'MALL',
      client: {
        id: 'demo-user-james-demo-local',
        name: 'James Demo',
        email: 'james@demo.local',
      },
    },
    cameras: Array.from({ length: 8 }, (_, i) => ({
      id: `demo-cctv-dh-cam-${i + 1}`,
      name: [
        'Entrance',
        'Parking A',
        'Parking B',
        'Loading bay',
        'Corridor',
        'Till area',
        'Stock room',
        'Perimeter rear',
      ][i],
      locationLabel: `Channel ${i + 1}`,
      channel: i + 1,
      serialNumber: `DH-BULLET-${2200 + i}`,
      model: '2MP Bullet',
      resolution: '2MP',
      placement: (i === 5 || i === 6 ? 'INTERIOR' : 'EXTERIOR') as 'EXTERIOR' | 'INTERIOR',
      status: 'ONLINE',
      vendor: 'Dahua',
    })),
  },
  {
    id: 'demo-cctv-proview-house',
    name: 'Pro View 4-Channel AHD Kit',
    brand: 'Pro View',
    model: '4 CHANNEL AHD CCTV KIT',
    kitSku: 'PROVIEW-AHD-4',
    supplier: 'Big Brother Security Wholesalers',
    recorderType: 'DVR',
    channelCount: 4,
    connectivity: 'AHD',
    recorderSerial: 'PV-AHD-DVR-7741',
    recorderIp: null,
    cloudId: 'PV-APP-3310',
    hddInstalled: false,
    hddSerial: null,
    hddCapacityGb: null,
    firmware: null,
    mobileAppEnabled: true,
    techNotes: 'DVR does not include hard drive. 4×20m cables + 1-4 way splitter installed.',
    status: 'ONLINE',
    installedAt: now,
    createdAt: now,
    updatedAt: now,
    property: {
      id: 'demo-site-home-1',
      name: 'Morningside Residence',
      address: '42 Musgrave Road, Morningside, Durban',
      propertyType: 'HOUSE',
      client: {
        id: 'demo-user-client-demo-local',
        name: 'Nomsa Client',
        email: 'client@demo.local',
      },
    },
    cameras: [
      {
        id: 'demo-cctv-pv-cam-1',
        name: 'Front gate',
        locationLabel: 'Driveway entrance',
        channel: 1,
        serialNumber: 'PV-IR-401',
        model: 'Colour IR Outdoor',
        resolution: 'AHD',
        placement: 'EXTERIOR',
        status: 'ONLINE',
        vendor: 'Pro View',
      },
      {
        id: 'demo-cctv-pv-cam-2',
        name: 'Driveway',
        locationLabel: 'Front driveway',
        channel: 2,
        serialNumber: 'PV-IR-402',
        model: 'Colour IR Outdoor',
        resolution: 'AHD',
        placement: 'EXTERIOR',
        status: 'ONLINE',
        vendor: 'Pro View',
      },
      {
        id: 'demo-cctv-pv-cam-3',
        name: 'Backyard',
        locationLabel: 'Rear patio',
        channel: 3,
        serialNumber: 'PV-IR-403',
        model: 'Colour IR Outdoor',
        resolution: 'AHD',
        placement: 'EXTERIOR',
        status: 'ONLINE',
        vendor: 'Pro View',
      },
      {
        id: 'demo-cctv-pv-cam-4',
        name: 'Garage',
        locationLabel: 'Side garage',
        channel: 4,
        serialNumber: 'PV-IR-404',
        model: 'Colour IR Outdoor',
        resolution: 'AHD',
        placement: 'EXTERIOR',
        status: 'ONLINE',
        vendor: 'Pro View',
      },
    ],
  },
];
