/** Demo alarm panel registry — mixbox PG-103 and dual-path panels. */

export type DemoAlarmSystem = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  kitSku: string | null;
  supplier: string | null;
  connectivity: string;
  panelSerial: string | null;
  imei: string | null;
  simIccid: string | null;
  wifiMac: string | null;
  wifiSsid: string | null;
  cloudId: string | null;
  appAccount: string | null;
  wirelessFrequency: string | null;
  wirelessCoding: string | null;
  gsmBands: string | null;
  wifiStandard: string | null;
  inputVoltage: string | null;
  backupBattery: string | null;
  icasaCert: string | null;
  rfidEnabled: boolean;
  touchKeypad: boolean;
  mobileAppEnabled: boolean;
  zoneCount: number;
  firmware: string | null;
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
};

export const DEMO_ALARM_PRESETS = [
  {
    id: 'mixbox-pg103',
    label: 'mixbox PG-103 WiFi+4G Dual Network',
    brand: 'mixbox',
    model: 'PG-103',
    kitSku: 'MIXBOX-PG103',
    supplier: 'ICASA TA-2021/3152',
    connectivity: 'WIFI_4G',
    wirelessFrequency: '433.92MHz',
    wirelessCoding: 'EV1527',
    gsmBands: '2G/4G',
    wifiStandard: 'IEEE802.11b/g/n',
    inputVoltage: 'DC5V (TYPE-C)',
    backupBattery: '3.7V/1000mAh lithium',
    icasaCert: 'TA-2021/3152',
    rfidEnabled: true,
    touchKeypad: true,
    mobileAppEnabled: true,
    zoneCount: 0,
  },
  {
    id: 'paradox-mg5050',
    label: 'Paradox MG5050 Dual-Path',
    brand: 'Paradox',
    model: 'MG5050',
    kitSku: 'PARADOX-MG5050',
    supplier: 'Paradox Security',
    connectivity: 'DUAL_PATH',
    wirelessFrequency: null,
    wirelessCoding: null,
    gsmBands: null,
    wifiStandard: null,
    inputVoltage: null,
    backupBattery: null,
    icasaCert: null,
    rfidEnabled: false,
    touchKeypad: true,
    mobileAppEnabled: true,
    zoneCount: 8,
  },
] as const;

export const DEMO_ALARM_SITE_TYPES = [
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

export const demoAlarmSystems: DemoAlarmSystem[] = [
  {
    id: 'demo-alarm-mixbox-home',
    name: 'mixbox PG-103 WiFi+4G Dual Network',
    brand: 'mixbox',
    model: 'PG-103',
    kitSku: 'MIXBOX-PG103',
    supplier: 'ICASA approved',
    connectivity: 'WIFI_4G',
    panelSerial: 'MX-PG103-884201',
    imei: '359632109874521',
    simIccid: '8927000000001234567',
    wifiMac: 'A4:CF:12:88:42:01',
    wifiSsid: '4DS-Home-Alarm',
    cloudId: 'MX-CLOUD-4421',
    appAccount: 'client@demo.local',
    wirelessFrequency: '433.92MHz',
    wirelessCoding: 'EV1527',
    gsmBands: '2G/4G',
    wifiStandard: 'IEEE802.11b/g/n',
    inputVoltage: 'DC5V (TYPE-C)',
    backupBattery: '3.7V/1000mAh lithium',
    icasaCert: 'TA-2021/3152',
    rfidEnabled: true,
    touchKeypad: true,
    mobileAppEnabled: true,
    zoneCount: 8,
    firmware: 'V2.1.0',
    techNotes:
      'WiFi+4G dual path. Touch keypad + RFID tags programmed for Nomsa & James. Siren on AUX <650mA.',
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
  },
  {
    id: 'demo-alarm-mixbox-store',
    name: 'mixbox PG-103 — Shop 214',
    brand: 'mixbox',
    model: 'PG-103',
    kitSku: 'MIXBOX-PG103',
    supplier: 'ICASA approved',
    connectivity: 'WIFI_4G',
    panelSerial: 'MX-PG103-991102',
    imei: '359632109874899',
    simIccid: null,
    wifiMac: 'A4:CF:12:99:11:02',
    wifiSsid: 'Gateway-Shop214',
    cloudId: 'MX-CLOUD-9911',
    appAccount: null,
    wirelessFrequency: '433.92MHz',
    wirelessCoding: 'EV1527',
    gsmBands: '2G/4G',
    wifiStandard: 'IEEE802.11b/g/n',
    inputVoltage: 'DC5V (TYPE-C)',
    backupBattery: '3.7V/1000mAh lithium',
    icasaCert: 'TA-2021/3152',
    rfidEnabled: true,
    touchKeypad: true,
    mobileAppEnabled: true,
    zoneCount: 4,
    firmware: null,
    techNotes: 'Commissioning — awaiting SIM activation for 4G failover.',
    status: 'COMMISSIONING',
    installedAt: null,
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
  },
  {
    id: 'demo-alarm-mixbox-warehouse',
    name: 'mixbox PG-103 — Prospecton warehouse',
    brand: 'mixbox',
    model: 'PG-103',
    kitSku: 'MIXBOX-PG103',
    supplier: 'ICASA approved',
    connectivity: 'WIFI_4G',
    panelSerial: 'MX-PG103-550331',
    imei: '359632109874550',
    simIccid: '8927000000005503311',
    wifiMac: 'A4:CF:12:55:03:31',
    wifiSsid: '4DS-Warehouse-Alarm',
    cloudId: 'MX-CLOUD-5503',
    appAccount: 'client@demo.local',
    wirelessFrequency: '433.92MHz',
    wirelessCoding: 'EV1527',
    gsmBands: '2G/4G',
    wifiStandard: 'IEEE802.11b/g/n',
    inputVoltage: 'DC5V (TYPE-C)',
    backupBattery: '3.7V/1000mAh lithium',
    icasaCert: 'TA-2021/3152',
    rfidEnabled: true,
    touchKeypad: true,
    mobileAppEnabled: true,
    zoneCount: 16,
    firmware: 'V2.1.0',
    techNotes: 'Perimeter beams + roller-door contacts. Warehouse default 3D model.',
    status: 'ONLINE',
    installedAt: now,
    createdAt: now,
    updatedAt: now,
    property: {
      id: 'demo-prop-3',
      name: 'Warehouse — Prospecton',
      address: '44 Industrial Rd, Prospecton',
      propertyType: 'WAREHOUSE',
      client: {
        id: 'demo-user-priya-warehouse-local',
        name: 'Priya Naidoo',
        email: 'priya@demo.local',
      },
    },
  },
];
