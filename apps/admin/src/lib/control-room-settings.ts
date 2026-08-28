const KEY = '4ds-cr-settings';

export const CR_SETTINGS_CHANGED_EVENT = '4ds-cr-settings-changed';

export type CrAuditEntry = {
  id: string;
  time: string;
  module: string;
  title: string;
  detail: string;
  actor: string;
};

export type CrSettings = {
  general: {
    timezone: string;
    language: string;
    clock24h: boolean;
    panicSound: boolean;
    compactTables: boolean;
    defaultMap: string;
    handoverTime: string;
  };
  notifications: {
    bell: boolean;
    sms: boolean;
    email: boolean;
    radio: boolean;
    quietHours: boolean;
    quietFrom: string;
    quietTo: string;
    panicOverride: boolean;
  };
  organisation: {
    name: string;
    tradingName: string;
    slug: string;
    registration: string;
    vat: string;
    supportPhone: string;
    afterHoursPhone: string;
    address: string;
  };
  security: {
    sessionMinutes: string;
    mfaOwners: boolean;
    mfaDispatchers: boolean;
    lockoutAttempts: string;
    passwordDays: string;
    deviceHeartbeat: boolean;
  };
  billing: {
    plan: string;
    invoiceEmail: string;
    vatInclusive: boolean;
    autoRetry: boolean;
  };
  integrations: {
    apiKey: string;
    webhooks: { id: string; name: string; url: string; enabled: boolean }[];
    connectors: { id: string; name: string; status: string; detail: string; enabled: boolean }[];
  };
  lens: {
    enabled: boolean;
    showP1: boolean;
    showPanic: boolean;
    showSla: boolean;
    showOpsAlerts: boolean;
    autoPeek: boolean;
    soundPanic: boolean;
    autoCollapse: '5' | '10' | 'never';
    dockEdge: 'top' | 'bottom';
  };
  audit: CrAuditEntry[];
};

const DEFAULTS: CrSettings = {
  general: {
    timezone: 'Africa/Johannesburg',
    language: 'en-ZA',
    clock24h: true,
    panicSound: true,
    compactTables: false,
    defaultMap: 'Durban, KwaZulu-Natal',
    handoverTime: '06:00',
  },
  notifications: {
    bell: true,
    sms: true,
    email: false,
    radio: true,
    quietHours: false,
    quietFrom: '22:00',
    quietTo: '06:00',
    panicOverride: true,
  },
  organisation: {
    name: '4DS Solutions',
    tradingName: '4DS Nexus',
    slug: 'demo',
    registration: '2020/445521/07',
    vat: '4120256789',
    supportPhone: '+27 86 000 0000',
    afterHoursPhone: '+27 82 000 4411',
    address: 'Umhlanga Rocks Drive, Durban North',
  },
  security: {
    sessionMinutes: '30',
    mfaOwners: true,
    mfaDispatchers: false,
    lockoutAttempts: '5',
    passwordDays: '90',
    deviceHeartbeat: true,
  },
  billing: {
    plan: 'Control Room Enterprise',
    invoiceEmail: 'accounts@demo.local',
    vatInclusive: true,
    autoRetry: true,
  },
  integrations: {
    apiKey: 'nx_live_4ds_demo_7f3a91c2',
    webhooks: [
      { id: 'wh-panic', name: 'Panic webhook', url: 'https://hooks.4ds.local/panic', enabled: true },
      { id: 'wh-billing', name: 'Billing events', url: 'https://hooks.4ds.local/billing', enabled: false },
    ],
    connectors: [
      { id: 'sms', name: 'SMS gateway', status: 'Connected', detail: 'Africa’s Talking · ZA', enabled: true },
      { id: 'radio', name: 'Radio bridge', status: 'Connected', detail: 'Control channel 1', enabled: true },
      { id: 'nvr', name: 'CCTV NVR', status: 'Degraded', detail: '2 cameras offline', enabled: true },
      { id: 'maps', name: 'Live maps', status: 'Connected', detail: 'Mapbox streets', enabled: true },
    ],
  },
  lens: {
    enabled: true,
    showP1: true,
    showPanic: true,
    showSla: true,
    showOpsAlerts: true,
    autoPeek: true,
    soundPanic: true,
    autoCollapse: 'never',
    dockEdge: 'bottom',
  },
  audit: [
    {
      id: 'a1',
      time: 'Today · 10:08',
      module: 'Users',
      title: 'Manager role updated',
      detail: 'Fleet live location and customer export permissions reviewed.',
      actor: 'Thabo Owner',
    },
    {
      id: 'a2',
      time: 'Today · 09:52',
      module: 'Alerts',
      title: 'Panic escalation adjusted',
      detail: 'Critical panic escalation now reaches management after 60 seconds.',
      actor: 'Ayesha Manager',
    },
    {
      id: 'a3',
      time: 'Today · 08:40',
      module: 'Billing',
      title: 'Developer revenue visibility changed',
      detail: 'Revenue scope returned to hidden pending contract sign-off.',
      actor: 'Thabo Owner',
    },
  ],
};

function stamp() {
  return new Date().toLocaleString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function loadCrSettings(): CrSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw) as Partial<CrSettings>;
    return {
      ...structuredClone(DEFAULTS),
      ...parsed,
      general: { ...DEFAULTS.general, ...parsed.general },
      notifications: { ...DEFAULTS.notifications, ...parsed.notifications },
      organisation: { ...DEFAULTS.organisation, ...parsed.organisation },
      security: { ...DEFAULTS.security, ...parsed.security },
      billing: { ...DEFAULTS.billing, ...parsed.billing },
      integrations: {
        ...DEFAULTS.integrations,
        ...parsed.integrations,
        webhooks: parsed.integrations?.webhooks ?? DEFAULTS.integrations.webhooks,
        connectors: parsed.integrations?.connectors ?? DEFAULTS.integrations.connectors,
      },
      lens: { ...DEFAULTS.lens, ...parsed.lens },
      audit: parsed.audit?.length ? parsed.audit : DEFAULTS.audit,
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveCrSettings(next: CrSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CR_SETTINGS_CHANGED_EVENT));
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((part) => parseInt(part, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function isInTimeWindow(now: Date, from: string, to: string): boolean {
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(from);
  const end = parseTimeToMinutes(to);
  if (start <= end) return mins >= start && mins < end;
  return mins >= start || mins < end;
}

/** True when routine alerts should be muted (notification quiet hours). */
export function isNotificationQuietHours(now = new Date()): boolean {
  const { quietHours, quietFrom, quietTo } = loadCrSettings().notifications;
  if (!quietHours) return false;
  return isInTimeWindow(now, quietFrom, quietTo);
}

export function shouldPlayPanicSound(): boolean {
  const settings = loadCrSettings();
  return settings.general.panicSound && settings.lens.soundPanic;
}

export function withAudit(
  current: CrSettings,
  module: string,
  title: string,
  detail: string,
  actor = 'Control room',
): CrSettings {
  const entry: CrAuditEntry = {
    id: `a-${Date.now()}`,
    time: `Today · ${stamp()}`,
    module,
    title,
    detail,
    actor,
  };
  return { ...current, audit: [entry, ...current.audit].slice(0, 40) };
}
