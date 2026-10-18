'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OpsRail } from '@/components/control-room/OpsRail';
import { OpsStatusBar } from '@/components/control-room/OpsStatusBar';
import { OpsTopBar } from '@/components/control-room/OpsTopBar';
import { OpsDeskProvider, type OpsDeskStats, type OpsOfficer, type OpsSite, type OpsVehicleHit } from '@/components/control-room/ops-desk';
import type { CctvCamera } from '@/components/portal/CctvLiveFeed';
import { useActionHandoff } from '@/hooks/useActionHandoff';
import { useApi } from '@/hooks/useApi';
import { useCrSettings } from '@/hooks/useCrSettings';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { adminHomeForRole } from '@/lib/admin-home';
import type { ArcDeskEvent, ArcOperatorResponse } from '@/lib/arc-desk';
import { AuthSession, clearSession } from '@/lib/auth';
import { canAccessControlRoomRoute } from '@/lib/control-room-nav';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { opsRailForRole } from '@/lib/ops-rail';
import type { OpsIncident } from '@/lib/ops-incident';

const PROPERTY_KEY = '4ds-ops-property';

type Dashboard = {
  stats?: {
    activeIncidents?: number;
    criticalIncidents?: number;
    availableOfficers?: number;
    totalOfficers?: number;
  };
  incidents?: OpsIncident[];
  officers?: OpsOfficer[];
};

type Surveillance = {
  stats?: { cameras?: number; offlineCameras?: number };
  sites?: OpsSite[];
  deskEvents?: ArcDeskEvent[];
  operatorResponses?: ArcOperatorResponse[];
};

type FleetVehicle = {
  id: string;
  callSign?: string;
  registration?: string;
  cameras?: CctvCamera[];
};

export function ControlRoomShell({
  session,
  children,
  title = 'Operations Wall',
}: {
  session: AuthSession;
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? '/control-room';
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const handoff = useActionHandoff();
  const crSettings = useCrSettings();
  const [expanded, setExpanded] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [propertyId, setPropertyIdState] = useState('all');
  const [networkOnline, setNetworkOnline] = useState(true);
  const [deskEvents, setDeskEvents] = useState<ArcDeskEvent[]>([]);
  const [operatorResponses, setOperatorResponses] = useState<ArcOperatorResponse[]>([]);

  const surveillance = useApi(() => adminApi.get<ApiResponse<Surveillance>>('/control-room/surveillance'), []);
  const dashboard = useApi(() => adminApi.get<ApiResponse<Dashboard>>('/control-room/dashboard'), []);
  const fleet = useApi(() => adminApi.get<ApiResponse<FleetVehicle[]>>('/control-room/fleet'), []);

  useEffect(() => {
    const payload = surveillance.data?.data;
    if (!payload) return;
    if (Array.isArray(payload.deskEvents)) setDeskEvents(payload.deskEvents);
    else {
      const fromSites = (payload.sites ?? []).flatMap((site) =>
        (site.openEvents ?? []).map((event) => ({
          id: event.id,
          propertyId: site.id,
          title: event.title,
          type: event.type,
          severity: event.severity,
          status: event.status,
          requiresAck: event.requiresAck !== false,
          triggeredAt: event.triggeredAt,
          claimedByUserId: event.claimedByUserId ?? null,
          claimedByName: event.claimedByName ?? null,
          zoneNumber: event.zoneNumber ?? null,
          requiredAction: event.requiredAction ?? null,
          reportAsType: event.reportAsType ?? null,
          responses: event.responses ?? [],
        })),
      );
      setDeskEvents(fromSites);
    }
    if (Array.isArray(payload.operatorResponses)) setOperatorResponses(payload.operatorResponses);
  }, [surveillance.data]);

  const reload = useCallback(() => {
    void surveillance.reload();
    void dashboard.reload();
    void fleet.reload();
  }, [surveillance.reload, dashboard.reload, fleet.reload]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PROPERTY_KEY);
      if (stored) setPropertyIdState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('cr-compact-tables', Boolean(crSettings.general?.compactTables));
  }, [crSettings.general?.compactTables]);

  useEffect(() => {
    setNavOpen(false);
    setExpanded(false);
  }, [pathname, search]);

  useEffect(() => {
    if (!helpOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setHelpOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen]);

  useEffect(() => {
    const sync = () => setNetworkOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    if (!shouldBackgroundPoll()) return;
    const id = window.setInterval(() => {
      void surveillance.reload({ silent: true });
      void dashboard.reload({ silent: true });
      void fleet.reload({ silent: true });
    }, 15000);
    return () => window.clearInterval(id);
  }, [surveillance.reload, dashboard.reload, fleet.reload]);

  const homeHref = adminHomeForRole(session.user.role);

  useEffect(() => {
    if (!pathname.startsWith('/control-room')) return;
    if (canAccessControlRoomRoute(session.user.role, pathname)) return;
    router.replace(homeHref);
  }, [pathname, session.user.role, homeHref, router]);

  const properties = surveillance.data?.data?.sites ?? [];

  useEffect(() => {
    if (propertyId === 'all' || surveillance.loading) return;
    if (propertyId.startsWith('vehicle:')) return;
    if (properties.length > 0 && !properties.some((site) => site.id === propertyId)) {
      setPropertyIdState('all');
    }
  }, [properties, propertyId, surveillance.loading]);

  const setPropertyId = useCallback((id: string) => {
    setPropertyIdState(id);
    try {
      sessionStorage.setItem(PROPERTY_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  function closeMobileNav() {
    setNavOpen(false);
    setExpanded(false);
  }

  function toggleRail() {
    const mobile = window.matchMedia('(max-width: 820px)').matches;
    if (mobile) {
      // More panel open → X / More only collapses the panel, keep the slim rail
      if (expanded) {
        setExpanded(false);
        return;
      }
      // Slim rail already open → open More beside it
      if (navOpen) {
        setExpanded(true);
        return;
      }
      // Rail off-screen → bring rail + More together
      setNavOpen(true);
      setExpanded(true);
      return;
    }
    setExpanded((current) => !current);
  }

  function logout() {
    handoff.begin('sign-out', () => {
      clearSession('admin');
      router.push('/login');
    });
  }

  const stats: OpsDeskStats | null = useMemo(() => {
    const dash = dashboard.data?.data?.stats;
    const cams = surveillance.data?.data?.stats;
    if (!dash && !cams) return null;
    return {
      cameras: cams?.cameras ?? 0,
      offlineCameras: cams?.offlineCameras ?? 0,
      activeIncidents: dash?.activeIncidents ?? 0,
      criticalIncidents: dash?.criticalIncidents ?? 0,
      availableOfficers: dash?.availableOfficers ?? 0,
      totalOfficers: dash?.totalOfficers ?? 0,
    };
  }, [dashboard.data, surveillance.data]);

  const vehicles: OpsVehicleHit[] = useMemo(
    () =>
      (fleet.data?.data ?? []).map((vehicle) => ({
        id: vehicle.id,
        callSign: vehicle.callSign ?? vehicle.registration ?? 'Vehicle',
        registration: vehicle.registration ?? '',
        cameras: Array.isArray(vehicle.cameras) ? vehicle.cameras : [],
      })),
    [fleet.data],
  );

  const desk = useMemo(
    () => ({
      role: session.user.role,
      operatorId: session.user.id,
      operatorName: `${session.user.firstName} ${session.user.lastName}`.trim(),
      query,
      setQuery,
      propertyId,
      setPropertyId,
      properties,
      incidents: dashboard.data?.data?.incidents ?? [],
      deskEvents,
      setDeskEvents,
      operatorResponses,
      officers: dashboard.data?.data?.officers ?? [],
      vehicles,
      stats,
      surveillanceLoading: surveillance.loading,
      surveillanceError: surveillance.error,
      deskOnline: Boolean(surveillance.data || dashboard.data) && !surveillance.error && !dashboard.error,
      reload,
    }),
    [
      session.user.role,
      session.user.id,
      session.user.firstName,
      session.user.lastName,
      query,
      propertyId,
      setPropertyId,
      properties,
      dashboard.data,
      dashboard.error,
      deskEvents,
      operatorResponses,
      vehicles,
      stats,
      surveillance.loading,
      surveillance.error,
      reload,
    ],
  );

  const groups = useMemo(() => opsRailForRole(session.user.role), [session.user.role]);
  const railExpanded = expanded || navOpen;

  return (
    <OpsDeskProvider value={desk}>
      {handoff.overlay}
      <div className={`ops-console ${navOpen ? 'ops-console--nav' : ''}`}>
        <h1 className="ops-sr">{title}</h1>
        <OpsTopBar
          session={session}
          onLogout={logout}
          onOpenNav={() => {
            setNavOpen(true);
            setExpanded(false);
          }}
          networkOnline={networkOnline}
        />
        <div className="ops-body">
          {navOpen ? (
            <button type="button" className="ops-scrim" aria-label="Close menu" onClick={closeMobileNav} />
          ) : null}
          <OpsRail
            groups={groups}
            pathname={pathname}
            search={search}
            expanded={railExpanded}
            onToggle={toggleRail}
            criticalCount={stats?.criticalIncidents ?? 0}
            onHelp={() => setHelpOpen(true)}
            onNotifications={() => document.getElementById('ops-notification-bell')?.click()}
          />
          <main className="ops-stage">{children}</main>
        </div>
        <OpsStatusBar networkOnline={networkOnline} />
        {helpOpen ? (
          <div className="ops-dialog" role="dialog" aria-modal="true" aria-labelledby="ops-help-title">
            <h2 id="ops-help-title">Control room</h2>
            <p>
              The operations wall is the live view. Cameras fill the screen. Events sit on the right. The status bar
              shows whether the property, network, and response team need attention.
            </p>
            <p>Expand the left menu for cameras, alarms, incidents, the map, vehicles, access, officers, and dispatch.</p>
            <button type="button" onClick={() => setHelpOpen(false)}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </OpsDeskProvider>
  );
}
