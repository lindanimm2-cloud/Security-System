'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClientCallInPanel,
  type CallInClient,
} from '@/components/control-room/ClientCallInPanel';
import { NotificationCenter } from '@/components/control-room/NotificationCenter';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  cameraOnlineCount,
  isOpsVehicleScope,
  OPS_ALL_DASHCAMS_SCOPE,
  opsVehicleScopeId,
  parseOpsVehicleScopeId,
  useOpsDesk,
} from '@/components/control-room/ops-desk';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { AuthSession } from '@/lib/auth';
import { incidentHref } from '@/lib/control-room-routes';
import { opsRailDestinations, opsRailForRole } from '@/lib/ops-rail';
import { roleDisplayLabel } from '@/lib/role-labels';

type Hit =
  | { kind: 'nav'; href: string; label: string; meta: string }
  | { kind: 'client'; client: CallInClient; label: string; meta: string };

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
};

export function OpsTopBar({
  session,
  onLogout,
  onOpenNav,
  networkOnline,
}: {
  session: AuthSession;
  onLogout: () => void;
  onOpenNav: () => void;
  networkOnline: boolean;
}) {
  const desk = useOpsDesk();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [dashcamOpen, setDashcamOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [callInClient, setCallInClient] = useState<CallInClient | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const propertyRef = useRef<HTMLDivElement>(null);
  const dashcamRef = useRef<HTMLDivElement>(null);

  const vehicleScopeId = parseOpsVehicleScopeId(desk.propertyId);
  const onVehicleScope = isOpsVehicleScope(desk.propertyId);
  const selectedPropertyId =
    !onVehicleScope && desk.properties.some((site) => site.id === desk.propertyId)
      ? desk.propertyId
      : 'all';
  const property =
    selectedPropertyId === 'all'
      ? null
      : (desk.properties.find((site) => site.id === selectedPropertyId) ?? null);
  const propertyLabel = onVehicleScope ? 'All properties' : property?.name ?? 'All properties';
  const health = propertyHealth(desk.properties, onVehicleScope ? 'all' : selectedPropertyId);

  const dashcamVehicles = useMemo(
    () => desk.vehicles.filter((vehicle) => (vehicle.cameras?.length ?? 0) > 0),
    [desk.vehicles],
  );
  const selectedDashcam =
    vehicleScopeId && vehicleScopeId !== 'all'
      ? dashcamVehicles.find((vehicle) => vehicle.id === vehicleScopeId) ?? null
      : null;
  const dashcamLabel =
    desk.propertyId === OPS_ALL_DASHCAMS_SCOPE
      ? 'All dashcams'
      : selectedDashcam
        ? selectedDashcam.callSign || selectedDashcam.registration || 'Dashcam'
        : 'Dashcams';
  const name = `${session.user.firstName} ${session.user.lastName}`.trim();
  const initials = `${session.user.firstName?.[0] ?? ''}${session.user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const deskLabel = session.user.role === 'SALES' || session.user.role === 'DEVELOPER'
    ? roleDisplayLabel(session.user.role)
    : 'Control Room';

  const hits = useMemo(
    () => buildHits(desk, session.user.role, customers),
    [desk, session.user.role, customers],
  );

  useEffect(() => {
    let cancelled = false;
    void adminApi
      .get<ApiResponse<CustomerRow[]>>('/control-room/customers')
      .then((res) => {
        if (!cancelled) setCustomers(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (propertyRef.current && !propertyRef.current.contains(target)) setPropertyOpen(false);
      if (dashcamRef.current && !dashcamRef.current.contains(target)) setDashcamOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setPropertyOpen(false);
        setDashcamOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
      <header className="ops-top">
        <button type="button" className="ops-top__menu" onClick={onOpenNav} aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>

        <div className="ops-property" ref={propertyRef}>
          <button
            type="button"
            className={`ops-menu-trigger ${propertyOpen ? 'is-open' : ''} ${onVehicleScope ? '' : 'is-active-scope'}`}
            aria-haspopup="listbox"
            aria-expanded={propertyOpen}
            aria-label="Organization or property"
            onClick={() => {
              setPropertyOpen((open) => !open);
              setDashcamOpen(false);
              setProfileOpen(false);
              setSearchOpen(false);
            }}
          >
            <span>{propertyLabel}</span>
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
              <path
                d="M3 4.5 L6 7.5 L9 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {propertyOpen ? (
            <ul className="ops-property__menu" role="listbox" aria-label="Properties">
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={!onVehicleScope && selectedPropertyId === 'all'}
                  className={!onVehicleScope && selectedPropertyId === 'all' ? 'is-on' : ''}
                  onClick={() => {
                    desk.setPropertyId('all');
                    setPropertyOpen(false);
                  }}
                >
                  <strong>All properties</strong>
                  <span>Portfolio</span>
                </button>
              </li>
              {desk.properties.map((site) => (
                <li key={site.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={!onVehicleScope && selectedPropertyId === site.id}
                    className={!onVehicleScope && selectedPropertyId === site.id ? 'is-on' : ''}
                    onClick={() => {
                      desk.setPropertyId(site.id);
                      setPropertyOpen(false);
                    }}
                  >
                    <strong>{site.name}</strong>
                    <span>
                      {site.onlineCameras}/{site.cameraCount} cams
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <span className={`ops-health ops-health--${health}`}>
            <i aria-hidden />
            {healthLabel(health)}
          </span>
        </div>

        <div className="ops-dashcam" ref={dashcamRef}>
          <button
            type="button"
            className={`ops-menu-trigger ops-menu-trigger--dashcam ${dashcamOpen ? 'is-open' : ''} ${onVehicleScope ? 'is-active-scope' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={dashcamOpen}
            aria-label="Dashcams"
            onClick={() => {
              setDashcamOpen((open) => !open);
              setPropertyOpen(false);
              setProfileOpen(false);
              setSearchOpen(false);
            }}
          >
            <span>{dashcamLabel}</span>
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
              <path
                d="M3 4.5 L6 7.5 L9 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {dashcamOpen ? (
            <ul className="ops-property__menu ops-dashcam__menu" role="listbox" aria-label="Dashcams">
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={desk.propertyId === OPS_ALL_DASHCAMS_SCOPE}
                  className={desk.propertyId === OPS_ALL_DASHCAMS_SCOPE ? 'is-on' : ''}
                  onClick={() => {
                    desk.setPropertyId(OPS_ALL_DASHCAMS_SCOPE);
                    setDashcamOpen(false);
                  }}
                >
                  <strong>All dashcams</strong>
                  <span>
                    {dashcamVehicles.reduce((sum, vehicle) => sum + (vehicle.cameras?.length ?? 0), 0)} cams
                  </span>
                </button>
              </li>
              {dashcamVehicles.length === 0 ? (
                <li className="ops-dashcam__empty" role="presentation">
                  No dashcam vehicles online
                </li>
              ) : (
                dashcamVehicles.map((vehicle) => {
                  const total = vehicle.cameras?.length ?? 0;
                  const online = cameraOnlineCount(vehicle.cameras);
                  const selected = selectedDashcam?.id === vehicle.id;
                  return (
                    <li key={vehicle.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={selected ? 'is-on' : ''}
                        onClick={() => {
                          desk.setPropertyId(opsVehicleScopeId(vehicle.id));
                          setDashcamOpen(false);
                        }}
                      >
                        <strong>{vehicle.callSign || vehicle.registration || 'Vehicle'}</strong>
                        <span>
                          {online}/{total} cams
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>

        <div className="ops-search" ref={searchRef}>
          <input
            type="search"
            value={desk.query}
            placeholder="Search clients, phone, cameras, incidents..."
            aria-label="Search clients, phone numbers, cameras, incidents, vehicles, officers"
            onChange={(event) => {
              desk.setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
          />
          {searchOpen && desk.query.trim() && hits.length > 0 ? (
            <ul className="ops-menu__panel ops-search__list" role="listbox">
              {hits.map((hit) =>
                hit.kind === 'client' ? (
                  <li key={`client-${hit.client.id}`} role="option">
                    <button
                      type="button"
                      className="ops-search__hit ops-search__hit--client"
                      onClick={() => {
                        setCallInClient(hit.client);
                        setSearchOpen(false);
                        desk.setQuery('');
                      }}
                    >
                      <span className="ops-search__hit-mark" aria-hidden>
                        {(hit.label.trim().charAt(0) || '?').toUpperCase()}
                      </span>
                      <span className="ops-search__hit-body">
                        <strong>{hit.label}</strong>
                        <span>{hit.meta}</span>
                      </span>
                    </button>
                  </li>
                ) : (
                  <li key={`${hit.meta}-${hit.href}-${hit.label}`} role="option">
                    <Link
                      href={hit.href}
                      className="ops-search__hit"
                      onClick={() => {
                        setSearchOpen(false);
                        if (hit.meta === 'Camera') desk.setQuery(hit.label);
                      }}
                    >
                      <span className="ops-search__hit-body">
                        <strong>{hit.label}</strong>
                        <span>{hit.meta}</span>
                      </span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          ) : null}
        </div>

        <div className="ops-top__cluster">
          <span className={`ops-health ${desk.deskOnline ? 'ops-health--online' : 'ops-health--offline'}`}>
            <i aria-hidden />
            {desk.deskOnline ? 'System online' : 'System check'}
          </span>
          <span className={`ops-health ${networkOnline ? 'ops-health--online' : 'ops-health--offline'}`}>
            <i aria-hidden />
            {networkOnline ? 'Network' : 'Network down'}
          </span>
          <NotificationCenter />
          <ThemeToggle className="theme-toggle--compact" />
          <div className="ops-profile" ref={profileRef}>
            <button
              type="button"
              className="ops-profile__btn"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-label="Operator profile"
            >
              <strong className="ops-profile__name">{name}</strong>
              <strong className="ops-profile__initials" aria-hidden>
                {initials}
              </strong>
              <span>{deskLabel}</span>
            </button>
            {profileOpen ? (
              <div className="ops-profile__menu" role="menu">
                <Link href="/control-room/profile" role="menuitem" onClick={() => setProfileOpen(false)}>
                  Profile
                </Link>
                <Link href="/control-room/my-settings" role="menuitem" onClick={() => setProfileOpen(false)}>
                  Settings
                </Link>
                <button type="button" role="menuitem" onClick={onLogout}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {callInClient ? (
        <ClientCallInPanel
          client={callInClient}
          onClose={() => setCallInClient(null)}
          onCreated={() => desk.reload()}
        />
      ) : null}
    </>
  );
}

function propertyHealth(
  sites: { id: string; alarmStatus: string; cameraCount: number; onlineCameras: number }[],
  propertyId: string,
): 'online' | 'degraded' | 'offline' | 'alarm' {
  const scoped = propertyId === 'all' ? sites : sites.filter((site) => site.id === propertyId);
  if (scoped.some((site) => site.alarmStatus === 'TRIGGERED')) return 'alarm';
  const cameras = scoped.reduce((sum, site) => sum + site.cameraCount, 0);
  const online = scoped.reduce((sum, site) => sum + site.onlineCameras, 0);
  if (cameras > 0 && online === 0) return 'offline';
  if (online < cameras) return 'degraded';
  return 'online';
}

function healthLabel(health: 'online' | 'degraded' | 'offline' | 'alarm') {
  if (health === 'alarm') return 'Alarm';
  if (health === 'offline') return 'Offline';
  if (health === 'degraded') return 'Degraded';
  return 'Online';
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function buildHits(
  desk: {
    query: string;
    properties: { id: string; name: string; cameras?: { id: string; name: string; locationLabel: string }[] }[];
    incidents: { id: string; type: string; user: string; location: string }[];
    officers: { id: string; name: string; zone?: string }[];
    vehicles: { id: string; callSign: string; registration: string }[];
  },
  role: string,
  customers: CustomerRow[],
): Hit[] {
  const q = desk.query.trim().toLowerCase();
  if (!q) return [];
  const qDigits = normalizePhone(desk.query);
  const hits: Hit[] = [];
  const push = (hit: Hit) => {
    if (hits.length >= 10) return;
    hits.push(hit);
  };

  for (const customer of customers) {
    const fullName = `${customer.firstName} ${customer.lastName}`.trim();
    const phone = customer.phone ?? '';
    const phoneDigits = normalizePhone(phone);
    const nameMatch = fullName.toLowerCase().includes(q) || customer.email?.toLowerCase().includes(q);
    const phoneMatch = qDigits.length >= 3 && phoneDigits.includes(qDigits);
    if (!nameMatch && !phoneMatch) continue;
    push({
      kind: 'client',
      client: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
      label: fullName,
      meta: phone ? `Client · ${phone}` : 'Client',
    });
  }

  for (const link of opsRailDestinations(opsRailForRole(role))) {
    if (link.label.toLowerCase().includes(q)) push({ kind: 'nav', href: link.href, label: link.label, meta: 'Go to' });
  }
  for (const site of desk.properties) {
    for (const camera of site.cameras ?? []) {
      const blob = `${camera.name} ${camera.locationLabel} ${site.name}`.toLowerCase();
      if (!blob.includes(q)) continue;
      push({
        kind: 'nav',
        href: `/control-room/surveillance/${site.id}`,
        label: camera.name,
        meta: site.name,
      });
    }
  }
  for (const incident of desk.incidents) {
    const blob = `${incident.type} ${incident.user} ${incident.location}`.toLowerCase();
    if (!blob.includes(q)) continue;
    push({ kind: 'nav', href: incidentHref(incident.id), label: incident.type, meta: incident.location || 'Incident' });
  }
  for (const officer of desk.officers) {
    if (!`${officer.name} ${officer.zone ?? ''}`.toLowerCase().includes(q)) continue;
    push({ kind: 'nav', href: '/control-room/officers', label: officer.name, meta: 'Officer' });
  }
  for (const vehicle of desk.vehicles) {
    if (!`${vehicle.callSign} ${vehicle.registration}`.toLowerCase().includes(q)) continue;
    push({
      kind: 'nav',
      href: '/control-room/fleet',
      label: vehicle.callSign || vehicle.registration,
      meta: vehicle.registration,
    });
  }
  return hits;
}
