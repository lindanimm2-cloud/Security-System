import type { AuthPortal, AuthSession } from './auth';

const TAB_ID_KEY = '4ds_tab_id';
const ALIVE_KEY = '4ds_tabs_alive';
const HEARTBEAT_MS = 1500;
const STALE_MS = 4000;

type AliveMap = Record<string, number>;

function readAlive(): AliveMap {
  try {
    const raw = localStorage.getItem(ALIVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AliveMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAlive(map: AliveMap) {
  try {
    localStorage.setItem(ALIVE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function pruneAlive(map: AliveMap, keepId?: string) {
  const now = Date.now();
  for (const [id, ts] of Object.entries(map)) {
    if (id !== keepId && now - ts > STALE_MS) delete map[id];
  }
  return map;
}

let localTabId: string | null = null;

/** Unique id for this browser tab. Duplicated tabs are forked so they do not share a lock. */
export function getTabId(): string {
  if (typeof window === 'undefined') return 'ssr';
  if (localTabId) return localTabId;
  let id = sessionStorage.getItem(TAB_ID_KEY);
  const alive = readAlive();
  const now = Date.now();
  if (id && alive[id] && now - alive[id] < STALE_MS) {
    id = crypto.randomUUID();
  }
  if (!id) id = crypto.randomUUID();
  sessionStorage.setItem(TAB_ID_KEY, id);
  localTabId = id;
  return id;
}

function heartbeat(tabId: string) {
  const map = pruneAlive(readAlive(), tabId);
  map[tabId] = Date.now();
  writeAlive(map);
}

function release(tabId: string) {
  const map = readAlive();
  delete map[tabId];
  writeAlive(map);
}

let booted = false;

/** Per-tab session isolation: unique tab id + heartbeat so other tabs stay independent. */
export function bootTabSession() {
  if (typeof window === 'undefined' || booted) return;
  booted = true;
  const tabId = getTabId();
  heartbeat(tabId);
  const timer = window.setInterval(() => heartbeat(tabId), HEARTBEAT_MS);

  function onHide() {
    if (document.visibilityState === 'hidden') heartbeat(tabId);
  }
  window.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', () => {
    window.clearInterval(timer);
    release(tabId);
  });
}

const PORTAL_LABEL: Record<AuthPortal, string> = {
  admin: 'Control Panel',
  client: 'Client Portal',
  officer: 'Officer',
  technician: 'Technician',
};

export function applyTabTitle(session: AuthSession | null, portal?: AuthPortal | null) {
  if (typeof document === 'undefined') return;
  if (!session) {
    if (portal) document.title = `${PORTAL_LABEL[portal]} — 4DS Nexus`;
    return;
  }
  const name = `${session.user.firstName} ${session.user.lastName}`.trim() || session.user.email;
  const role = session.user.role.replace(/_/g, ' ');
  const where =
    session.user.role === 'DEVELOPER'
      ? 'Developer'
      : portal
        ? PORTAL_LABEL[portal]
        : '4DS Nexus';
  document.title = `${name} · ${role} · ${where}`;
}
