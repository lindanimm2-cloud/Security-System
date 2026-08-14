'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { CONTROL_ROOM_ROUTES, customerHref } from '@/lib/control-room-routes';
import { fetchInternalChat } from '@/lib/internal-chat-api';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { friendlyErrorMessage } from '@/lib/friendly-error';

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

type SalesDash = {
  stats: {
    openLeads: number;
    wonDeals: number;
    pipelineFormatted: string;
    wonFormatted: string;
    orders: number;
    pipeline: Record<string, number>;
  };
  leads: Lead[];
};

type NotificationData = {
  unreadCount: number;
};

type BillingOverview = {
  pastDueCount: number;
  revenueAtRiskFormatted: string;
};

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

type CustomersResponse = {
  data: CustomerRow[];
};

type DashboardLite = {
  stats: {
    activeIncidents: number;
    criticalIncidents: number;
    availableOfficers: number;
    totalOfficers: number;
  };
  incidents: { id: string; type: string; user: string; priority: string }[];
};

type PanelTab = 'intel' | 'search' | 'notify';

async function softGet<T>(path: string): Promise<T | null> {
  try {
    return await adminApi.get<T>(path);
  } catch {
    return null;
  }
}
type Insight = {
  id: string;
  tone: 'hot' | 'warn' | 'info' | 'good';
  title: string;
  detail: string;
  href: string;
  action: string;
};

const HIDDEN_KEY = 'crm-eye-lens-hidden';
const POS_KEY = 'crm-eye-lens-pos';
const MODE_KEY = 'crm-eye-lens-mode';

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function endOfDay(d = new Date()) {
  return startOfDay(d) + 86400000 - 1;
}

function formatFollowUp(iso: string) {
  const t = new Date(iso).getTime();
  const today = startOfDay();
  if (t < today) return 'Overdue';
  if (t <= endOfDay()) return 'Today';
  if (t <= endOfDay(new Date(Date.now() + 86400000))) return 'Tomorrow';
  return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
}

function IconEye({ active }: { active?: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.8-6.5 9.5-6.5S21.5 12 21.5 12 17.7 18.5 12 18.5 2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r={active ? 1.55 : 1.15} fill="currentColor" />
      <path d="M12 5.5v1.2M12 17.3v1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M9 4.5l6 2.2 5-2.2v14.2l-5 2.2-6-2.2-5 2.2V6.7l5-2.2z" />
      <path d="M9 4.5v14.2M15 6.7v14.2" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M6.2 9.2a5.8 5.8 0 0111.6 0c0 4.2 1.4 5.4 1.4 5.4H4.8s1.4-1.2 1.4-5.4z" />
      <path d="M10 18.6a2 2 0 004 0" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M5 5.5h14a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5H9.2L5 20.2V7A1.5 1.5 0 015 5.5z" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M7.2 3.8l2.4 2.4a1.2 1.2 0 010 1.7l-1.3 1.3a12.5 12.5 0 006.5 6.5l1.3-1.3a1.2 1.2 0 011.7 0l2.4 2.4a1.2 1.2 0 010 1.7l-1.5 1.5c-.8.8-2 .9-3 .5A18.5 18.5 0 014.2 7.3c-.4-1-.3-2.2.5-3l1.5-1.5a1.2 1.2 0 011.7 0z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M16 16l4.2 4.2" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M4 13.5l1.6-7.2A2 2 0 017.55 5h8.9a2 2 0 011.95 1.3L20 13.5" />
      <path d="M4 13.5h4.2l1.3 2h5l1.3-2H20v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M8 3.8v3.2M16 3.8v3.2M4 10h16" />
      <path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h.01M12 17h.01" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.6l1.6 1.6M17.5 15.8l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.4l1.6-1.6M17.5 8.2l1.6-1.6" />
    </svg>
  );
}

function IconDrag() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="7" r="1.4" />
      <circle cx="15" cy="7" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="17" r="1.4" />
      <circle cx="15" cy="17" r="1.4" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="eye-lens__badge">{count > 99 ? '99+' : count}</span>;
}

export function CrmEyeLens() {
  const router = useRouter();
  const dockRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

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
    width: 360,
    maxHeight: 360,
  });
  const autoOpenedRef = useRef(false);
  const firstName = getSession('admin')?.user.firstName ?? 'Operator';
  const calls = useCallsOptional();
  const [callBusy, setCallBusy] = useState(false);

  const { data: dashRes, reload: reloadDash } = useApi(
    () => softGet<ApiResponse<DashboardLite>>('/control-room/dashboard'),
    [],
  );
  const { data: salesRes, reload: reloadSales } = useApi(
    () => softGet<ApiResponse<SalesDash>>('/store/sales/dashboard'),
    [],
  );
  const { data: notifRes, reload: reloadNotifs } = useApi(
    () => softGet<ApiResponse<NotificationData>>('/control-room/notifications'),
    [],
  );
  const { data: billingRes, reload: reloadBilling } = useApi(
    () => softGet<ApiResponse<BillingOverview>>('/control-room/billing/overview'),
    [],
  );
  const { data: customersRes } = useApi(
    () => softGet<CustomersResponse>('/control-room/customers'),
    [],
  );
  const { data: chatRes, reload: reloadChat } = useApi(async () => {
    try {
      return await fetchInternalChat('admin', 'internal');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(HIDDEN_KEY) === '1');
      const savedMode = localStorage.getItem(MODE_KEY);
      if (savedMode === 'bar' || savedMode === 'mini') {
        setMini(savedMode === 'mini');
      } else {
        setMini(window.matchMedia('(max-width: 900px)').matches);
      }
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { x: number; y: number };
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPos(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void reloadDash({ silent: true });
      void reloadSales({ silent: true });
      void reloadNotifs({ silent: true });
      void reloadBilling({ silent: true });
      void reloadChat({ silent: true });
    }, 30000);
    return () => window.clearInterval(id);
  }, [reloadDash, reloadSales, reloadNotifs, reloadBilling, reloadChat]);

  const dash = dashRes?.data;
  const criticals = dash?.stats.criticalIncidents ?? 0;
  const openIncidents = dash?.stats.activeIncidents ?? 0;
  const availableOfficers = dash?.stats.availableOfficers ?? 0;
  const totalOfficers = dash?.stats.totalOfficers ?? 0;
  const hotIncidents = useMemo(
    () =>
      (dash?.incidents ?? []).filter((i) =>
        ['critical', 'CRITICAL', 'high', 'HIGH'].includes(i.priority),
      ),
    [dash],
  );

  /** Auto-open critical menu once on desktop; mobile stays badge-first to reduce clutter. */
  useEffect(() => {
    if (hidden || !ready) return;
    if (criticals > 0 && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setTab('intel');
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      if (!isMobile) setOpen(true);
    }
    if (criticals === 0) {
      autoOpenedRef.current = false;
    }
  }, [criticals, hidden, ready]);

  const layoutPanel = useCallback(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const rect = dock.getBoundingClientRect();
    const pad = 8;
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(360, vw - pad * 2);
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
    const maxHeight = Math.max(140, Math.min(vh * 0.56, available));
    const center = rect.left + rect.width / 2;
    const viewLeft = Math.min(Math.max(pad, center - width / 2), vw - width - pad);
    setPanelFit({
      placement,
      left: viewLeft - rect.left,
      width,
      maxHeight,
    });
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
  }, [ready, hidden, open, pos, mini, layoutPanel]);

  /** Close panel when pressing outside it (scrim + pointer outside toolbar/panel). */
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

  const stats = salesRes?.data?.stats;
  const leads = salesRes?.data?.leads ?? [];
  const unread = notifRes?.data?.unreadCount ?? 0;
  const pastDue = billingRes?.data?.pastDueCount ?? 0;
  const atRisk = billingRes?.data?.revenueAtRiskFormatted ?? '';

  const customers = useMemo(() => customersRes?.data ?? [], [customersRes]);

  const chatUnread = useMemo(() => {
    const me = getSession('admin')?.user.id;
    if (!me) return 0;
    const messages = chatRes?.data?.messages ?? [];
    const cutoff = Date.now() - 60 * 60 * 1000;
    return messages.filter(
      (m) => m.sender.id !== me && new Date(m.createdAt).getTime() > cutoff,
    ).length;
  }, [chatRes]);

  const followUps = useMemo(() => {
    const nowEnd = endOfDay(new Date(Date.now() + 2 * 86400000));
    return leads
      .filter((l) => l.nextFollowUp && !['WON', 'LOST'].includes(l.status))
      .filter((l) => new Date(l.nextFollowUp!).getTime() <= nowEnd)
      .sort(
        (a, b) =>
          new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime(),
      );
  }, [leads]);

  const overdueFollowUps = followUps.filter(
    (l) => new Date(l.nextFollowUp!).getTime() < startOfDay(),
  );
  const dueToday = followUps.filter((l) => {
    const t = new Date(l.nextFollowUp!).getTime();
    return t >= startOfDay() && t <= endOfDay();
  });

  const insights = useMemo<Insight[]>(() => {
    const items: Insight[] = [];

    if (criticals > 0) {
      const top = hotIncidents[0];
      items.push({
        id: 'critical',
        tone: 'hot',
        title: `${criticals} critical open`,
        detail: top
          ? `${top.type} · ${top.user} — dispatch now`
          : 'Life-safety incidents need an operator.',
        href: CONTROL_ROOM_ROUTES.incidents,
        action: 'Handle',
      });
    }

    if (openIncidents > 0 && criticals === 0) {
      items.push({
        id: 'open-inc',
        tone: 'warn',
        title: `${openIncidents} active incident${openIncidents === 1 ? '' : 's'}`,
        detail: 'Board is live — keep dispatch coverage tight.',
        href: CONTROL_ROOM_ROUTES.dispatch,
        action: 'Dispatch',
      });
    }

    if (totalOfficers > 0 && availableOfficers / Math.max(1, totalOfficers) < 0.35) {
      items.push({
        id: 'coverage',
        tone: 'warn',
        title: `Low officer coverage · ${availableOfficers}/${totalOfficers}`,
        detail: 'Available units are thin for current load.',
        href: CONTROL_ROOM_ROUTES.officers,
        action: 'Officers',
      });
    }

    if (unread > 0) {
      items.push({
        id: 'alerts',
        tone: criticals > 0 ? 'hot' : 'warn',
        title: `${unread} unread ops alert${unread === 1 ? '' : 's'}`,
        detail: 'Signals that may affect field response or accounts.',
        href: CONTROL_ROOM_ROUTES.incidents,
        action: 'Review',
      });
    }

    if (pastDue > 0) {
      items.push({
        id: 'past-due',
        tone: 'info',
        title: `${pastDue} past-due subscription${pastDue === 1 ? '' : 's'}`,
        detail: atRisk ? `${atRisk} at risk — renewals need chase.` : 'Billing needs attention.',
        href: `${CONTROL_ROOM_ROUTES.customers}?filter=PAST_DUE`,
        action: 'Customers',
      });
    }

    if (overdueFollowUps.length > 0) {
      const first = overdueFollowUps[0];
      items.push({
        id: 'overdue-fu',
        tone: 'info',
        title: `${overdueFollowUps.length} overdue sales follow-up${overdueFollowUps.length === 1 ? '' : 's'}`,
        detail: `Start with ${first.contactName}${first.companyName ? ` · ${first.companyName}` : ''}.`,
        href: '/control-room/sales',
        action: 'Sales',
      });
    } else if (dueToday.length > 0) {
      items.push({
        id: 'due-today',
        tone: 'good',
        title: `${dueToday.length} follow-up${dueToday.length === 1 ? '' : 's'} due today`,
        detail: dueToday
          .slice(0, 2)
          .map((l) => l.contactName)
          .join(', '),
        href: '/control-room/sales',
        action: 'Pipeline',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'clear',
        tone: 'good',
        title: 'Ops lens clear',
        detail: 'No critical incidents or overdue chase items right now.',
        href: CONTROL_ROOM_ROUTES.map,
        action: 'Live map',
      });
    }

    return items.slice(0, 5);
  }, [
    criticals,
    hotIncidents,
    openIncidents,
    availableOfficers,
    totalOfficers,
    unread,
    pastDue,
    atRisk,
    overdueFollowUps,
    dueToday,
  ]);

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { leads: [] as Lead[], customers: [] as CustomerRow[] };

    const leadHits = leads
      .filter((l) =>
        [l.contactName, l.companyName, l.contactEmail, l.contactPhone, l.interest]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6);

    const customerHits = customers
      .filter((c) =>
        [`${c.firstName} ${c.lastName}`, c.email, c.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6);

    return { leads: leadHits, customers: customerHits };
  }, [query, leads, customers]);

  const callTarget = useCallback(
    async (target: {
      userId?: string;
      name: string;
      phone?: string | null;
      incidentId?: string;
    }) => {
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
    [calls, router],
  );

  async function handleLensCall() {
    const hot = hotIncidents[0] ?? dash?.incidents?.[0];
    const match =
      (hot
        ? customers.find((c) => `${c.firstName} ${c.lastName}` === hot.user)
        : null) ??
      searchHits.customers[0] ??
      customers[0];
    if (match) {
      await callTarget({
        userId: match.id,
        name: `${match.firstName} ${match.lastName}`,
        phone: match.phone,
        incidentId: hot?.id,
      });
      return;
    }
    if (hot) {
      await callTarget({ name: hot.user, incidentId: hot.id });
      return;
    }
    if (!calls?.portal) {
      router.push(CONTROL_ROOM_ROUTES.communications);
      return;
    }
    setTab('search');
    setOpen(true);
  }

  const persistMode = useCallback((nextMini: boolean) => {
    setMini(nextMini);
    try {
      localStorage.setItem(MODE_KEY, nextMini ? 'mini' : 'bar');
    } catch {
      /* ignore */
    }
  }, []);

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

  function onDragStart(e: ReactPointerEvent<HTMLButtonElement>) {
    const dock = dockRef.current;
    if (!dock) return;
    e.preventDefault();
    const rect = dock.getBoundingClientRect();
    dragRef.current = {
      ox: e.clientX,
      oy: e.clientY,
      px: pos?.x ?? rect.left,
      py: pos?.y ?? rect.top,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onDragMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const dock = dockRef.current;
    if (!dragRef.current || !dock) return;
    const dx = e.clientX - dragRef.current.ox;
    const dy = e.clientY - dragRef.current.oy;
    const w = dock.offsetWidth;
    const h = dock.offsetHeight;
    const next = {
      x: Math.min(Math.max(8, dragRef.current.px + dx), window.innerWidth - w - 8),
      y: Math.min(Math.max(8, dragRef.current.py + dy), window.innerHeight - h - 8),
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

  if (!ready) return null;

  if (hidden) {
    return (
      <button
        type="button"
        className={`eye-lens-restore ${criticals > 0 ? 'eye-lens-restore--hot' : ''}`}
        onClick={restore}
        title="Open 4DS Ops Lens"
        aria-label="Open 4DS Ops Lens"
      >
        <IconEye active />
        {criticals > 0 && <Badge count={criticals} />}
      </button>
    );
  }

  const barStyle =
    pos != null
      ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const, transform: 'none' }
      : undefined;

  return (
    <>
      {open ? (
        <button
          type="button"
          className="eye-lens-scrim"
          aria-label="Close quick actions"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        ref={dockRef}
        className={`eye-lens-dock ${mini ? 'eye-lens-dock--mini' : ''} ${pos != null ? 'eye-lens-dock--placed' : ''} ${open ? 'eye-lens-dock--open' : ''}`}
        style={barStyle}
      >
      <div
        ref={barRef}
        className={`eye-lens ${mini ? 'eye-lens--mini' : ''} ${open ? 'eye-lens--open' : ''} ${criticals > 0 ? 'eye-lens--hot' : ''}`}
        role="toolbar"
        aria-label="4DS Ops Lens"
      >
        <button
          type="button"
          className="eye-lens__drag"
          aria-label="Drag ops lens"
          title="Drag"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <IconDrag />
        </button>

        <button
          type="button"
          className={`eye-lens__tool eye-lens__tool--eye ${open && tab === 'intel' ? 'eye-lens__tool--active' : ''} ${criticals > 0 ? 'eye-lens__tool--critical' : ''}`}
          aria-pressed={open && tab === 'intel'}
          aria-label="Ops intel"
          title="Ops Eye"
          onClick={() => {
            if (open && tab === 'intel') setOpen(false);
            else {
              setTab('intel');
              setOpen(true);
            }
          }}
        >
          <IconEye active={(open && tab === 'intel') || criticals > 0} />
          <Badge count={criticals} />
        </button>

        {mini ? (
          <button
            type="button"
            className="eye-lens__copy"
            aria-label={
              criticals > 0
                ? `${criticals} critical — expand tools`
                : `Expand ops tools for ${firstName}`
            }
            title="Show ops tools"
            onClick={() => {
              persistMode(false);
              if (criticals > 0) {
                setTab('intel');
                setOpen(true);
              }
            }}
          >
            <strong>{criticals > 0 ? `${criticals} critical` : firstName}</strong>
            <span>
              {criticals > 0
                ? 'Needs action now'
                : unread > 0
                  ? `${unread} update${unread === 1 ? '' : 's'} waiting`
                  : `Here are your updates, ${firstName}.`}
            </span>
          </button>
        ) : null}

        <div className="eye-lens__tools">
        <button
          type="button"
          className={`eye-lens__tool ${open && tab === 'notify' ? 'eye-lens__tool--active-soft' : ''}`}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          title="Alerts"
          onClick={() => {
            setTab('notify');
            setOpen(true);
            void reloadNotifs();
          }}
        >
          <IconBell />
          <Badge count={unread} />
        </button>

        <button
          type="button"
          className="eye-lens__tool"
          aria-label={`Chat${chatUnread ? `, ${chatUnread} recent` : ''}`}
          title="Team chat"
          onClick={() => router.push(CONTROL_ROOM_ROUTES.chat)}
        >
          <IconChat />
          <Badge count={chatUnread} />
        </button>

        <button
          type="button"
          className="eye-lens__tool"
          aria-label="Live map"
          title="Live map"
          onClick={() => router.push(CONTROL_ROOM_ROUTES.map)}
        >
          <IconMap />
        </button>

        <button
          type="button"
          className="eye-lens__tool"
          aria-label="Call client / dispatch"
          title={callBusy ? 'Connecting…' : 'Call'}
          disabled={callBusy}
          onClick={() => void handleLensCall()}
        >
          <IconPhone />
        </button>

        <button
          type="button"
          className={`eye-lens__tool ${open && tab === 'search' ? 'eye-lens__tool--active-soft' : ''}`}
          aria-label="Search customers"
          title="Search"
          onClick={() => {
            setTab('search');
            setOpen(true);
          }}
        >
          <IconSearch />
        </button>

        <button
          type="button"
          className="eye-lens__tool"
          aria-label="Documents"
          title="Documents"
          onClick={() => router.push(CONTROL_ROOM_ROUTES.documents)}
        >
          <IconInbox />
        </button>

        <button
          type="button"
          className="eye-lens__tool"
          aria-label="Sales follow-ups"
          title="Follow-ups"
          onClick={() => {
            setTab('intel');
            setOpen(true);
            router.push('/control-room/sales');
          }}
        >
          <IconCalendar />
          <Badge count={overdueFollowUps.length + dueToday.length} />
        </button>

        <button
          type="button"
          className="eye-lens__tool eye-lens__tool--gear"
          aria-label="Settings"
          title="Settings"
          onClick={() => router.push('/control-room/settings')}
        >
          <IconGear />
        </button>
        </div>

        {mini ? (
          <button
            type="button"
            className="eye-lens__expand"
            aria-label="Expand ops tools"
            title="Expand"
            onClick={() => persistMode(false)}
          >
            <IconExpand />
          </button>
        ) : (
          <button
            type="button"
            className="eye-lens__close"
            aria-label="Collapse to mini view"
            title="Mini view"
            onClick={() => {
              setOpen(false);
              persistMode(true);
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div
          ref={panelRef}
          className={`eye-lens-panel ${panelFit.placement === 'below' ? 'eye-lens-panel--below' : 'eye-lens-panel--above'} ${criticals > 0 ? 'eye-lens-panel--critical' : ''}`}
          style={{
            left: panelFit.left,
            width: panelFit.width,
            maxHeight: panelFit.maxHeight,
          }}
          role="dialog"
          aria-modal="true"
          aria-label="4DS Ops Lens"
        >
          <div className="eye-lens-panel__header">
            <div>
              <p className="eye-lens-panel__eyebrow">
                {criticals > 0 ? 'Critical quick actions' : '4DS Ops Lens'}
              </p>
              <h3>
                {tab === 'intel' && (criticals > 0 ? 'Needs action now' : 'Quick actions')}
                {tab === 'search' && 'Find people'}
                {tab === 'notify' && 'Ops alerts'}
              </h3>
            </div>
            <button
              type="button"
              className="eye-lens-panel__x"
              aria-label="Close panel"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          {tab === 'intel' && (
            <div className="eye-lens-panel__body">
              <div className="eye-lens-stats">
                <div className="eye-lens-stat">
                  <span>Critical</span>
                  <strong className={criticals > 0 ? 'eye-lens-stat--hot' : ''}>{criticals}</strong>
                </div>
                <div className="eye-lens-stat">
                  <span>Incidents</span>
                  <strong>{openIncidents}</strong>
                </div>
                <div className="eye-lens-stat">
                  <span>Officers</span>
                  <strong>
                    {availableOfficers}/{Math.max(totalOfficers, availableOfficers)}
                  </strong>
                </div>
                <div className="eye-lens-stat">
                  <span>Alerts</span>
                  <strong className={unread > 0 ? 'eye-lens-stat--hot' : ''}>{unread}</strong>
                </div>
              </div>

              <ul className="eye-lens-insights">
                {insights.map((item) => (
                  <li key={item.id} className={`eye-lens-insight eye-lens-insight--${item.tone}`}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                    <Link href={item.href} className="eye-lens-insight__go" onClick={() => setOpen(false)}>
                      {item.action}
                    </Link>
                  </li>
                ))}
              </ul>

              {hotIncidents.length > 0 && (
                <div className="eye-lens-section">
                  <h4>Hot incidents</h4>
                  <ul className="eye-lens-list">
                    {hotIncidents.slice(0, 4).map((i) => (
                      <li key={i.id}>
                        <div>
                          <strong>{i.type}</strong>
                          <span>{i.user}</span>
                        </div>
                        <Link
                          href={CONTROL_ROOM_ROUTES.dispatch}
                          className="eye-lens-call-btn"
                          onClick={() => setOpen(false)}
                        >
                          Dispatch
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {followUps.length > 0 && (
                <div className="eye-lens-section">
                  <h4>Sales follow-ups</h4>
                  <ul className="eye-lens-list">
                    {followUps.slice(0, 3).map((l) => (
                      <li key={l.id}>
                        <div>
                          <strong>{l.contactName}</strong>
                          <span>
                            {l.companyName ? `${l.companyName} · ` : ''}
                            {l.status}
                          </span>
                        </div>
                        <em>{formatFollowUp(l.nextFollowUp!)}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === 'search' && (
            <div className="eye-lens-panel__body">
              <label className="eye-lens-search">
                <IconSearch />
                <input
                  autoFocus
                  type="search"
                  placeholder="Search leads or customers…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>

              {query.trim().length < 2 ? (
                <p className="eye-lens-empty">Type at least 2 characters to search.</p>
              ) : searchHits.leads.length === 0 && searchHits.customers.length === 0 ? (
                <p className="eye-lens-empty">No matches for “{query.trim()}”.</p>
              ) : (
                <>
                  {searchHits.leads.length > 0 && (
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
                  )}
                  {searchHits.customers.length > 0 && (
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
                                onClick={() =>
                                  void callTarget({
                                    userId: c.id,
                                    name: `${c.firstName} ${c.lastName}`,
                                    phone: c.phone,
                                  })
                                }
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
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'notify' && (
            <div className="eye-lens-panel__body">
              <div className={`eye-lens-notify ${unread > 0 ? 'eye-lens-notify--live' : ''}`}>
                <strong>{unread}</strong>
                <span>unread ops notification{unread === 1 ? '' : 's'}</span>
              </div>
              <p className="eye-lens-empty">
                Critical items are sorted first in the bell feed. Jump to incidents or dispatch if something looks urgent.
              </p>
              <div className="eye-lens-panel__actions">
                <Link
                  href={CONTROL_ROOM_ROUTES.incidents}
                  className="eye-lens-btn eye-lens-btn--primary"
                  onClick={() => setOpen(false)}
                >
                  Incidents
                </Link>
                <Link
                  href={CONTROL_ROOM_ROUTES.map}
                  className="eye-lens-btn"
                  onClick={() => setOpen(false)}
                >
                  Live map
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
