'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { EyeLensCriticalPanel, EyeLensMiniPlayer } from '@/components/control-room/EyeLensCriticalPanel';
import { useTheme } from '@/components/ThemeProvider';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { useApi } from '@/hooks/useApi';
import { usePlatformEvents } from '@/hooks/usePlatformEvents';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { canAccessControlRoomRoute } from '@/lib/control-room-nav';
import { CR_SETTINGS_CHANGED_EVENT } from '@/lib/control-room-settings';
import { CONTROL_ROOM_ROUTES, customerHref } from '@/lib/control-room-routes';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import {
  criticalLensQueue,
  effectiveLensSettings,
  lensBadge,
  lensRouteContext,
  loadLensSettings,
  playLensAlertTone,
  recordLensAudit,
  type CrLensSettings,
} from '@/lib/eye-lens';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { fetchInternalChat } from '@/lib/internal-chat-api';
import { type OpsIncident } from '@/lib/ops-incident';
import { CrmEyeLensIcons as I } from '@/components/control-room/CrmEyeLensIcons';

type Lead = {
  id: string;
  companyName: string | null;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  interest: string | null;
  estimatedFormatted: string | null;
  nextFollowUp: string | null;
  ownerName: string;
};

type SalesDash = { leads: Lead[] };
type NotificationData = { unreadCount: number };
type CustomerRow = { id: string; firstName: string; lastName: string; email: string; phone: string | null };
type CustomersResponse = { data: CustomerRow[] };
type DashboardLite = {
  stats: {
    activeIncidents: number;
    criticalIncidents: number;
    availableOfficers: number;
    totalOfficers: number;
  };
  incidents: OpsIncident[];
  officers?: { id: string; name: string; status: string; zone?: string }[];
};
type PanelTab = 'intel' | 'search' | 'notify';

async function softGet<T>(path: string): Promise<T | null> {
  try {
    return await adminApi.get<T>(path);
  } catch {
    return null;
  }
}

const HIDDEN_KEY = 'crm-eye-lens-hidden';
const POS_KEY = 'crm-eye-lens-pos';
const MODE_KEY = 'crm-eye-lens-mode';
const SELECTED_KEY = 'crm-eye-lens-selected';
const ACK_KEY = 'crm-eye-lens-ack';
const SEEN_KEY = 'crm-eye-lens-seen';

const DEFAULT_PLACEHOLDER: CrLensSettings = {
  enabled: true,
  showP1: true,
  showPanic: true,
  showSla: true,
  showOpsAlerts: true,
  autoPeek: true,
  soundPanic: true,
  autoCollapse: 'never',
  dockEdge: 'bottom',
};

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function endOfDay(d = new Date()) {
  return startOfDay(d) + 86400000 - 1;
}

function Badge({ count, tone }: { count: number; tone?: 'critical' | 'panic' | 'info' }) {
  if (count <= 0) return null;
  return (
    <span className={`eye-lens__badge ${tone ? `eye-lens__badge--${tone}` : ''}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 14l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrmEyeLens() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { theme, toggleTheme } = useTheme();
  const dockRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const interactingRef = useRef(false);
  const lastOpenAuditRef = useRef(0);

  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(true);
  const [tab, setTab] = useState<PanelTab>('intel');
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [panelFit, setPanelFit] = useState({
    placement: 'above' as 'above' | 'below',
    left: 0,
    width: 380,
    maxHeight: 420,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ackedIds, setAckedIds] = useState<Set<string>>(new Set());
  const [peekId, setPeekId] = useState<string | null>(null);
  const [lensSettings, setLensSettings] = useState<CrLensSettings>(DEFAULT_PLACEHOLDER);
  const [callBusy, setCallBusy] = useState(false);
  const session = getSession('admin');
  const role = session?.user.role ?? 'DISPATCHER';
  const actor = session ? `${session.user.firstName} ${session.user.lastName}` : 'Control room';
  const calls = useCallsOptional();

  const { data: dashRes, reload: reloadDash } = useApi(
    () => softGet<ApiResponse<DashboardLite>>('/control-room/dashboard'),
    [],
  );
  const { data: salesRes } = useApi(() => softGet<ApiResponse<SalesDash>>('/store/sales/dashboard'), []);
  const { data: notifRes, reload: reloadNotifs } = useApi(
    () => softGet<ApiResponse<NotificationData>>('/control-room/notifications'),
    [],
  );
  const { data: customersRes } = useApi(() => softGet<CustomersResponse>('/control-room/customers'), []);
  const { data: chatRes, reload: reloadChat } = useApi(async () => {
    try {
      return await fetchInternalChat('admin', 'internal');
    } catch {
      return null;
    }
  }, []);

  usePlatformEvents('admin', ['incident:created', 'incident:updated', 'incident:acked', 'dispatch:updated'], () => {
    void reloadDash({ silent: true });
  });

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(HIDDEN_KEY) === '1');
      const savedMode = localStorage.getItem(MODE_KEY);
      if (savedMode === 'bar' || savedMode === 'mini') setMini(savedMode === 'mini');
      else setMini(window.matchMedia('(max-width: 900px)').matches);
      const lensEdge = loadLensSettings().dockEdge;
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { x: number; y: number };
        const validPos =
          typeof parsed.x === 'number' &&
          typeof parsed.y === 'number' &&
          !(lensEdge === 'bottom' && parsed.y < window.innerHeight * 0.35);
        if (validPos) setPos(parsed);
        else localStorage.removeItem(POS_KEY);
      }
      setSelectedId(sessionStorage.getItem(SELECTED_KEY));
      setAckedIds(new Set(readJson<string[]>(ACK_KEY, [])));
    } catch {
      /* ignore */
    }
    setLensSettings(loadLensSettings());
    setReady(true);
  }, []);

  useEffect(() => {
    function sync() {
      setLensSettings(loadLensSettings());
    }
    window.addEventListener(CR_SETTINGS_CHANGED_EVENT, sync);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CR_SETTINGS_CHANGED_EVENT, sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const prevDockEdgeRef = useRef<CrLensSettings['dockEdge'] | null>(null);

  useEffect(() => {
    if (prevDockEdgeRef.current === null) {
      prevDockEdgeRef.current = lensSettings.dockEdge;
      return;
    }
    if (prevDockEdgeRef.current === lensSettings.dockEdge) return;
    prevDockEdgeRef.current = lensSettings.dockEdge;
    setPos(null);
    try {
      localStorage.removeItem(POS_KEY);
    } catch {
      /* ignore */
    }
  }, [lensSettings.dockEdge]);

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => {
      void reloadDash({ silent: true });
      void reloadNotifs({ silent: true });
      void reloadChat({ silent: true });
    }, 30000);
    return () => window.clearInterval(id);
  }, [reloadDash, reloadNotifs, reloadChat]);

  const dash = dashRes?.data;
  const incidents = dash?.incidents ?? [];
  const settings = effectiveLensSettings(lensSettings);
  const queue = useMemo(() => criticalLensQueue(incidents, settings, ackedIds), [incidents, settings, ackedIds]);
  const badge = lensBadge(queue);
  const slaCount = queue.filter((i) => i.slaBreached).length;
  const selected = incidents.find((i) => i.id === selectedId) ?? queue.find((i) => i.id === selectedId) ?? null;
  const peek = peekId ? (incidents.find((i) => i.id === peekId) ?? queue.find((i) => i.id === peekId) ?? null) : null;
  const context = lensRouteContext(pathname);
  const panicLive = badge.panic;

  const perms = useMemo(
    () => ({
      map: canAccessControlRoomRoute(role, CONTROL_ROOM_ROUTES.map),
      cctv: canAccessControlRoomRoute(role, CONTROL_ROOM_ROUTES.surveillance),
      fleet: canAccessControlRoomRoute(role, CONTROL_ROOM_ROUTES.fleet),
      dispatch: canAccessControlRoomRoute(role, CONTROL_ROOM_ROUTES.dispatch),
      call: canAccessControlRoomRoute(role, CONTROL_ROOM_ROUTES.communications) || Boolean(calls?.portal),
    }),
    [role, calls],
  );

  useEffect(() => {
    if (!ready) return;
    try {
      const seen = new Set(readJson<string[]>(SEEN_KEY, []));
      if (seen.size === 0 && queue.length > 0) {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify(queue.map((i) => i.id)));
        return;
      }
      const newcomers = queue.filter((i) => !seen.has(i.id));
      if (newcomers.length === 0) return;
      const hot = newcomers.find((i) => i.type.toUpperCase().includes('PANIC')) ?? newcomers[0];
      for (const item of newcomers) seen.add(item.id);
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
      if (settings.autoPeek && hot) {
        setPeekId(hot.id);
        window.setTimeout(() => setPeekId((cur) => (cur === hot.id ? null : cur)), 2500);
      }
      if (settings.soundPanic && (hot.type.toUpperCase().includes('PANIC') || hot.slaBreached)) {
        playLensAlertTone();
      }
    } catch {
      /* ignore */
    }
  }, [queue, ready, settings.autoPeek, settings.soundPanic]);

  const layoutPanel = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const rect = dock.getBoundingClientRect();
    const pad = 8;
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(400, vw - pad * 2);
    const spaceAbove = Math.max(0, rect.top - pad);
    const spaceBelow = Math.max(0, vh - rect.bottom - pad);
    const comfortable = 220;
    const placement: 'above' | 'below' =
      spaceAbove >= comfortable && spaceAbove >= spaceBelow * 0.85
        ? 'above'
        : spaceBelow > spaceAbove
          ? 'below'
          : 'above';
    const available = (placement === 'below' ? spaceBelow : spaceAbove) - gap;
    const maxHeight = Math.max(180, Math.min(vh * 0.72, available > 120 ? available : vh * 0.62));
    const center = rect.left + rect.width / 2;
    const viewLeft = Math.min(Math.max(pad, center - width / 2), vw - width - pad);
    setPanelFit({ placement, left: viewLeft - rect.left, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!ready || hidden) return;
    layoutPanel();
    const dock = dockRef.current;
    const ro = dock ? new ResizeObserver(layoutPanel) : null;
    if (dock) ro?.observe(dock);
    window.addEventListener('resize', layoutPanel);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', layoutPanel);
    };
  }, [ready, hidden, open, pos, mini, layoutPanel, selectedId]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (dockRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || settings.autoCollapse === 'never') return;
    if (interactingRef.current || panicLive) return;
    const ms = settings.autoCollapse === '5' ? 5000 : 10000;
    const id = window.setTimeout(() => {
      if (!interactingRef.current && !panicLive) setOpen(false);
    }, ms);
    return () => window.clearTimeout(id);
  }, [open, settings.autoCollapse, panicLive, selectedId, tab]);

  const leads = salesRes?.data?.leads ?? [];
  const unread = notifRes?.data?.unreadCount ?? 0;
  const customers = useMemo(() => customersRes?.data ?? [], [customersRes]);
  const chatUnread = useMemo(() => {
    const me = session?.user.id;
    if (!me) return 0;
    const messages = chatRes?.data?.messages ?? [];
    const cutoff = Date.now() - 60 * 60 * 1000;
    return messages.filter((m) => m.sender.id !== me && new Date(m.createdAt).getTime() > cutoff).length;
  }, [chatRes, session]);

  const followUps = useMemo(() => {
    const nowEnd = endOfDay(new Date(Date.now() + 2 * 86400000));
    return leads
      .filter((l) => l.nextFollowUp && !['WON', 'LOST'].includes(l.status))
      .filter((l) => new Date(l.nextFollowUp!).getTime() <= nowEnd)
      .sort((a, b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime());
  }, [leads]);
  const calendarBadge = followUps.filter((l) => new Date(l.nextFollowUp!).getTime() <= endOfDay()).length;

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { leads: [] as Lead[], customers: [] as CustomerRow[] };
    return {
      leads: leads
        .filter((l) =>
          [l.contactName, l.companyName, l.contactEmail, l.contactPhone, l.interest]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
        .slice(0, 6),
      customers: customers
        .filter((c) =>
          [`${c.firstName} ${c.lastName}`, c.email, c.phone].filter(Boolean).join(' ').toLowerCase().includes(q),
        )
        .slice(0, 6),
    };
  }, [query, leads, customers]);

  const callTarget = useCallback(
    async (target: { userId?: string; name: string; phone?: string | null; incidentId?: string }) => {
      recordLensAudit('Call initiated', `${target.name}${target.incidentId ? ` · ${target.incidentId}` : ''}`, actor);
      if (!calls?.portal) {
        router.push(CONTROL_ROOM_ROUTES.communications);
        return;
      }
      setCallBusy(true);
      try {
        await calls.startCall('INTERNAL', {
          userId: target.userId,
          name: target.name,
          phone: target.phone ?? undefined,
          role: 'CLIENT',
          incidentId: target.incidentId,
        });
      } catch (err) {
        alert(friendlyErrorMessage(err, 'call'));
      } finally {
        setCallBusy(false);
      }
    },
    [calls, router, actor],
  );

  const persistMode = useCallback((nextMini: boolean) => {
    setMini(nextMini);
    try {
      localStorage.setItem(MODE_KEY, nextMini ? 'mini' : 'bar');
    } catch {
      /* ignore */
    }
  }, []);

  const persistSelected = useCallback((id: string | null) => {
    setSelectedId(id);
    try {
      if (id) sessionStorage.setItem(SELECTED_KEY, id);
      else sessionStorage.removeItem(SELECTED_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const openLens = useCallback(
    (nextTab: PanelTab = 'intel') => {
      setTab(nextTab);
      setOpen(true);
      const now = Date.now();
      if (nextTab === 'intel' && now - lastOpenAuditRef.current > 20_000) {
        lastOpenAuditRef.current = now;
        recordLensAudit('Lens opened', 'Critical Quick Actions', actor);
      }
    },
    [actor],
  );

  const hide = useCallback(() => {
    setHidden(true);
    setOpen(false);
    try {
      sessionStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const restore = useCallback(() => {
    setHidden(false);
    persistMode(true);
    setTab('intel');
    try {
      sessionStorage.removeItem(HIDDEN_KEY);
    } catch {
      /* ignore */
    }
  }, [persistMode]);

  async function acknowledge(incident: OpsIncident) {
    setAckedIds((cur) => {
      const next = new Set(cur);
      next.add(incident.id);
      try {
        sessionStorage.setItem(ACK_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
    recordLensAudit('Incident acknowledged', `${incident.type} · ${incident.user}`, actor);
    try {
      await adminApi.post(`/control-room/incidents/${incident.id}/notes`, { body: 'Ops timeline: ACK' });
    } catch {
      /* demo / offline */
    }
    void reloadDash({ silent: true });
  }

  async function escalate(incident: OpsIncident) {
    recordLensAudit('Escalation initiated', `${incident.type} · ${incident.user}`, actor);
    try {
      await adminApi.post(`/control-room/incidents/${incident.id}/notes`, { body: 'Ops timeline: ESCALATE' });
    } catch {
      /* demo / offline */
    }
  }

  function onDragStart(e: ReactPointerEvent<HTMLButtonElement>) {
    const dock = dockRef.current;
    if (!dock) return;
    e.preventDefault();
    const rect = dock.getBoundingClientRect();
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos?.x ?? rect.left, py: pos?.y ?? rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDragMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const dock = dockRef.current;
    if (!dragRef.current || !dock) return;
    const next = {
      x: Math.min(Math.max(8, dragRef.current.px + (e.clientX - dragRef.current.ox)), window.innerWidth - dock.offsetWidth - 8),
      y: Math.min(Math.max(8, dragRef.current.py + (e.clientY - dragRef.current.oy)), window.innerHeight - dock.offsetHeight - 8),
    };
    setPos(next);
  }
  function onDragEnd() {
    if (!pos) {
      dragRef.current = null;
      return;
    }
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  }

  const policyForce = panicLive;
  const showLens = settings.enabled || policyForce;
  if (!ready) return null;
  if (!showLens) return null;

  if (hidden) {
    return (
      <button
        type="button"
        className={`eye-lens-restore eye-lens-restore--bottom ${panicLive ? 'eye-lens-restore--panic' : badge.count > 0 ? 'eye-lens-restore--hot' : ''}`}
        onClick={restore}
        data-tip="Critical Quick Actions"
        aria-label="Open Critical Quick Actions Lens"
      >
        {panicLive ? <I.Panic /> : <I.Eye active />}
        <Badge count={badge.count} tone={panicLive ? 'panic' : badge.count > 0 ? 'critical' : undefined} />
      </button>
    );
  }

  const barStyle =
    pos != null
      ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const, transform: 'none' }
      : undefined;
  const lensTone = panicLive ? 'panic' : badge.count > 0 ? 'critical' : 'idle';
  const showMiniPlayer = Boolean(selected) && !open;

  function goCall(incident: OpsIncident, target: 'client' | 'officer') {
    if (target === 'officer') {
      void callTarget({ name: incident.officer ?? 'Officer', phone: incident.officerPhone, incidentId: incident.id });
      return;
    }
    void callTarget({ name: incident.user, phone: incident.userPhone, incidentId: incident.id });
  }

  function goNav(href: string) {
    if (href.includes('map')) recordLensAudit('Map opened', href, actor);
    else if (href.includes('surveillance')) recordLensAudit('CCTV opened', href, actor);
    else if (href.includes('incidents')) recordLensAudit('Incident opened', href, actor);
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {open ? (
        <button type="button" className="eye-lens-scrim" aria-label="Close Critical Quick Actions" onClick={() => setOpen(false)} />
      ) : null}
      <div
        ref={dockRef}
        className={`eye-lens-dock eye-lens-dock--${settings.dockEdge} ${mini ? 'eye-lens-dock--mini' : ''} ${pos != null ? 'eye-lens-dock--placed' : ''} ${open ? 'eye-lens-dock--open' : ''}`}
        style={barStyle}
        onPointerDown={() => {
          interactingRef.current = true;
        }}
        onPointerUp={() => {
          window.setTimeout(() => {
            interactingRef.current = false;
          }, 400);
        }}
      >
        <div
          ref={barRef}
          className={`eye-lens eye-lens--${lensTone} ${mini ? 'eye-lens--mini' : ''} ${open ? 'eye-lens--open' : ''}`}
          role="toolbar"
          aria-label="Control Room Command Dock"
        >
          <button
            type="button"
            className="eye-lens__drag"
            aria-label="Move command dock"
            title="Move"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <I.Drag />
          </button>

          <div className="eye-lens__group" role="group" aria-label="Command">
            <button
              type="button"
              className={`eye-lens__tool eye-lens__tool--eye ${open && tab === 'intel' ? 'eye-lens__tool--active' : ''} ${panicLive ? 'eye-lens__tool--panic' : badge.count > 0 ? 'eye-lens__tool--critical' : ''}`}
              aria-pressed={open && tab === 'intel'}
              aria-label={
                panicLive
                  ? `Critical Quick Actions, ${badge.count} panic`
                  : `Critical Quick Actions${badge.count ? `, ${badge.count} requiring attention` : ''}`
              }
              data-tip="Critical Quick Actions"
              onClick={() => {
                if (open && tab === 'intel') setOpen(false);
                else openLens('intel');
              }}
            >
              {panicLive ? <I.Panic /> : <I.Eye active={open && tab === 'intel'} />}
              <Badge count={badge.count} tone={panicLive ? 'panic' : badge.count > 0 ? 'critical' : undefined} />
            </button>
            <button
              type="button"
              className={`eye-lens__tool ${open && tab === 'notify' ? 'eye-lens__tool--active-soft' : ''}`}
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
              data-tip="Notifications"
              onClick={() => {
                openLens('notify');
                void reloadNotifs();
              }}
            >
              <I.Bell />
              <Badge count={unread} tone="info" />
            </button>
            {canAccessControlRoomRoute(role, CONTROL_ROOM_ROUTES.chat) ? (
              <button
                type="button"
                className="eye-lens__tool"
                aria-label={`Communications${chatUnread ? `, ${chatUnread} recent` : ''}`}
                data-tip="Communications"
                onClick={() => router.push(CONTROL_ROOM_ROUTES.chat)}
              >
                <I.Chat />
                <Badge count={chatUnread} tone="info" />
              </button>
            ) : null}
          </div>

          <div className="eye-lens__tools">
            <span className="eye-lens__rule" aria-hidden />
            <div className="eye-lens__group" role="group" aria-label="Operations">
              {perms.map ? (
                <button
                  type="button"
                  className={`eye-lens__tool ${pathname.includes('/control-room/map') ? 'eye-lens__tool--on' : ''}`}
                  aria-label="Live Map"
                  data-tip="Live Map"
                  onClick={() => router.push(CONTROL_ROOM_ROUTES.map)}
                >
                  <I.Map />
                </button>
              ) : null}
              {perms.call ? (
                <button
                  type="button"
                  className="eye-lens__tool"
                  aria-label="Control Room Calling"
                  data-tip={callBusy ? "Connecting…" : "Control Room Calling"}
                  disabled={callBusy}
                  onClick={() => {
                    const hot = selected ?? queue[0];
                    if (hot) goCall(hot, 'client');
                    else router.push(CONTROL_ROOM_ROUTES.communications);
                  }}
                >
                  <I.Phone />
                </button>
              ) : null}
              <button
                type="button"
                className={`eye-lens__tool ${open && tab === 'search' ? 'eye-lens__tool--active-soft' : ''}`}
                aria-label="Global Search"
                data-tip="Global Search"
                onClick={() => openLens('search')}
              >
                <I.Search />
              </button>
              {perms.fleet ? (
                <button
                  type="button"
                  className={`eye-lens__tool ${pathname.includes('/control-room/fleet') ? 'eye-lens__tool--on' : ''}`}
                  aria-label="Fleet & Units"
                  data-tip="Fleet & Units"
                  onClick={() => router.push(CONTROL_ROOM_ROUTES.fleet)}
                >
                  <I.Fleet />
                </button>
              ) : null}
              <button
                type="button"
                className="eye-lens__tool"
                aria-label="Operations Calendar"
                data-tip="Operations Calendar"
                onClick={() => router.push('/control-room/sales')}
              >
                <I.Calendar />
                <Badge count={calendarBadge} tone="info" />
              </button>
            </div>
            <span className="eye-lens__rule" aria-hidden />
            <div className="eye-lens__group" role="group" aria-label="System">
              <button type="button" className="eye-lens__tool" aria-label="Display Settings" data-tip="Display Settings" onClick={toggleTheme}>
                <I.Display dark={theme === 'dark'} />
              </button>
              <button type="button" className="eye-lens__close" aria-label="Close Command Dock" data-tip="Close Command Dock" onClick={hide}>
                ×
              </button>
            </div>
          </div>

          {mini ? (
            <button type="button" className="eye-lens__expand" aria-label="Expand command dock" data-tip="Expand" onClick={() => persistMode(false)}>
              <I.Expand />
            </button>
          ) : null}
        </div>

        {peek && !open ? (
          <button
            type="button"
            className="eye-lens-peek"
            onClick={() => {
              persistSelected(peek.id);
              openLens('intel');
              setPeekId(null);
            }}
          >
            <strong>
              {peek.type.toUpperCase().includes('PANIC') ? 'P1 PANIC' : peek.type} · {peek.user}
            </strong>
            <span>Respond now</span>
          </button>
        ) : null}

        {showMiniPlayer && selected ? (
          <EyeLensMiniPlayer
            incident={selected}
            acked={ackedIds.has(selected.id)}
            callBusy={callBusy}
            perms={perms}
            onOpen={() => openLens('intel')}
            onCall={(target) => goCall(selected, target)}
            onAssigned={() => {
              recordLensAudit('Dispatch initiated', `${selected.type} · ${selected.user}`, actor);
              void reloadDash();
            }}
            onNavigate={goNav}
          />
        ) : null}

        {open ? (
          <div
            className={`eye-lens-panel ${panelFit.placement === 'below' ? 'eye-lens-panel--below' : 'eye-lens-panel--above'} ${panicLive ? 'eye-lens-panel--panic' : badge.count > 0 ? 'eye-lens-panel--critical' : ''}`}
            style={{ left: panelFit.left, width: panelFit.width, maxHeight: panelFit.maxHeight }}
            role="dialog"
            aria-modal="true"
            aria-label={tab === 'intel' ? 'Critical Quick Actions' : tab === 'search' ? 'Global Search' : 'Notifications'}
          >
            {tab === 'intel' ? (
              <EyeLensCriticalPanel
                tab="intel"
                incidents={queue}
                selected={selected}
                ackedIds={ackedIds}
                activeCount={dash?.stats.activeIncidents ?? incidents.length}
                fieldAvailable={dash?.stats.availableOfficers ?? 0}
                fieldTotal={dash?.stats.totalOfficers ?? 0}
                slaCount={slaCount}
                callBusy={callBusy}
                context={context}
                perms={perms}
                availableOfficers={dash?.officers ?? []}
                onSelect={(id) => {
                  persistSelected(id);
                  const item = incidents.find((i) => i.id === id);
                  if (item) recordLensAudit('Incident viewed', `${item.type} · ${item.user}`, actor);
                }}
                onBack={() => persistSelected(null)}
                onCollapse={() => setOpen(false)}
                onAcknowledge={(incident) => void acknowledge(incident)}
                onCall={goCall}
                onEscalate={(incident) => void escalate(incident)}
                onAssigned={() => {
                  if (selected) recordLensAudit('Dispatch initiated', `${selected.type} · ${selected.user}`, actor);
                  void reloadDash();
                }}
                onNavigate={goNav}
              />
            ) : null}

            {tab === 'search' ? (
              <div className="eye-lens-panel__body">
                <header className="eye-lens-head">
                  <div>
                    <p className="eye-lens-head__title">Global Search</p>
                    <p className="eye-lens-head__sub">Customers and leads</p>
                  </div>
                  <button type="button" className="eye-lens-collapse" aria-label="Collapse search" onClick={() => setOpen(false)}>
                    <Chevron />
                  </button>
                </header>
                <label className="eye-lens-search">
                  <I.Search />
                  <input autoFocus type="search" placeholder="Search leads or customers…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </label>
                {query.trim().length < 2 ? (
                  <p className="eye-lens-empty">Type at least 2 characters to search.</p>
                ) : searchHits.leads.length === 0 && searchHits.customers.length === 0 ? (
                  <p className="eye-lens-empty">No matches for “{query.trim()}”.</p>
                ) : (
                  <>
                    {searchHits.leads.length > 0 ? (
                      <div className="eye-lens-section">
                        <h4>Leads</h4>
                        <ul className="eye-lens-list">
                          {searchHits.leads.map((l) => (
                            <li key={l.id}>
                              <div>
                                <strong>{l.contactName}</strong>
                                <span>
                                  {l.status}
                                  {l.estimatedFormatted ? ` · ${l.estimatedFormatted}` : ''}
                                </span>
                              </div>
                              <Link href="/control-room/sales" onClick={() => setOpen(false)}>
                                Open
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {searchHits.customers.length > 0 ? (
                      <div className="eye-lens-section">
                        <h4>Customers</h4>
                        <ul className="eye-lens-list">
                          {searchHits.customers.map((c) => (
                            <li key={c.id}>
                              <div>
                                <strong>
                                  {c.firstName} {c.lastName}
                                </strong>
                                <span>{c.email}</span>
                              </div>
                              <div className="eye-lens-list__actions">
                                <button
                                  type="button"
                                  className="eye-lens-call-btn"
                                  disabled={callBusy}
                                  onClick={() => void callTarget({ userId: c.id, name: `${c.firstName} ${c.lastName}`, phone: c.phone })}
                                >
                                  Call
                                </button>
                                <Link href={customerHref(c.id)} onClick={() => setOpen(false)}>
                                  Open
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {tab === 'notify' ? (
              <div className="eye-lens-panel__body">
                <header className="eye-lens-head">
                  <div>
                    <p className="eye-lens-head__title">Notifications</p>
                    <p className="eye-lens-head__sub">Routine ops updates</p>
                  </div>
                  <button type="button" className="eye-lens-collapse" aria-label="Collapse notifications" onClick={() => setOpen(false)}>
                    <Chevron />
                  </button>
                </header>
                <div className={`eye-lens-notify ${unread > 0 ? 'eye-lens-notify--live' : ''}`}>
                  <strong>{unread}</strong>
                  <span>unread notification{unread === 1 ? '' : 's'}</span>
                </div>
                <p className="eye-lens-empty">
                  The Lens badge only counts panic, duress, P1 and critical SLA items. Routine notifications stay here.
                </p>
                <div className="eye-lens-panel__actions">
                  <Link href={CONTROL_ROOM_ROUTES.incidents} className="eye-lens-btn eye-lens-btn--primary" onClick={() => setOpen(false)}>
                    Incidents
                  </Link>
                  <Link href={CONTROL_ROOM_ROUTES.map} className="eye-lens-btn" onClick={() => setOpen(false)}>
                    Live map
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
