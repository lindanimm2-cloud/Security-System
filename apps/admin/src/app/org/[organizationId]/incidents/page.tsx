'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OrgPageHeader } from '@/components/org/OrgPageChrome';
import { OpsMarqueeText } from '@/components/ui/OpsMarquee';
import { OpsMonActionsMenu, type OpsMonAction } from '@/components/ops/OpsMonActionsMenu';
import { getOrgSession, listIncidents, type OrgIncident } from '@/lib/org';

type StatusTone = 'ok' | 'alert' | 'fault' | 'offline' | 'muted';

function incidentStatusLabel(status: string) {
  switch (status) {
    case 'NEW':
      return 'Needs response';
    case 'ACKNOWLEDGED':
      return 'Acknowledged';
    case 'DISPATCHED':
      return 'Dispatched';
    case 'RESPONDING':
      return 'Response underway';
    case 'ON_SCENE':
      return 'On scene';
    case 'RESOLVED':
      return 'Resolved';
    case 'CLOSED':
      return 'Closed';
    default:
      return status.replace(/_/g, ' ');
  }
}

function incidentTone(status: string): StatusTone {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'ok';
  if (status === 'RESPONDING' || status === 'ON_SCENE') return 'alert';
  if (status === 'DISPATCHED' || status === 'ACKNOWLEDGED') return 'fault';
  if (status === 'NEW') return 'offline';
  return 'muted';
}

function toneFill(tone: StatusTone) {
  switch (tone) {
    case 'ok':
      return 100;
    case 'alert':
      return 75;
    case 'fault':
      return 48;
    case 'offline':
      return 22;
    default:
      return 35;
  }
}

function formatClock(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

function IncidentTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.includes('panic') || t.includes('sos')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M12 3.2 21 19.5H3L12 3.2z" />
        <path d="M12 9.2v4.6M12 16.6h.01" />
      </svg>
    );
  }
  if (t.includes('medical')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20.2c1.2-3.2 3.5-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
      </svg>
    );
  }
  if (t.includes('fire')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M12 21c3.6 0 6-2.4 6-5.6 0-3.2-2.2-5.2-4.2-7.2-.4 2.2-1.6 3.2-1.6 3.2S10.4 8 10.2 5.4C8 7.4 6 10 6 15.4 6 18.6 8.4 21 12 21z" />
      </svg>
    );
  }
  if (t.includes('camera') || t.includes('cctv')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <rect x="3.5" y="7" width="12.5" height="10" rx="1.5" />
        <path d="m16 10.5 4.5-2.5v8L16 13.5" />
      </svg>
    );
  }
  if (t.includes('gate') || t.includes('security')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M4 20V6.5L12 4l8 2.5V20" />
        <path d="M12 4v16M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M12 3.2c-2.8 1-5.2 1.3-7.4 1.5v6.4c0 4.2 3 7.6 7.4 9.2 4.4-1.6 7.4-5 7.4-9.2V4.7c-2.2-.2-4.6-.5-7.4-1.5z" />
    </svg>
  );
}

function OpsSignal({ fill }: { fill: number }) {
  const level = Math.max(1, Math.min(4, Math.ceil((fill / 100) * 4)));
  return (
    <span className="ops-mon__signal" title={`${fill}%`}>
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={n <= level ? 'is-on' : undefined} />
      ))}
      <em>{fill}%</em>
    </span>
  );
}

function OpsStatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`ops-mon__status ops-mon__status--${tone}`}>
      <em aria-hidden />
      <OpsMarqueeText>{label}</OpsMarqueeText>
    </span>
  );
}

function incidentActions(incident: OrgIncident, base: string, code: string): OpsMonAction[] {
  return [
    {
      id: 'open',
      label: 'Open incident',
      description: code,
      href: `${base}/incidents`,
    },
    {
      id: 'map',
      label: 'Open live map',
      description: incident.siteName,
      href: `${base}/map`,
    },
    {
      id: 'cctv',
      label: 'View CCTV',
      href: `${base}/cctv`,
    },
    {
      id: 'dispatch',
      label: 'Dispatch officer',
      description: 'Send site security response',
      href: `${base}/security`,
    },
    {
      id: 'copy',
      label: 'Copy reference',
      description: code,
      onClick: () => {
        void navigator.clipboard?.writeText(code);
      },
    },
  ];
}

function isActive(status: string) {
  return !['RESOLVED', 'CLOSED'].includes(status);
}

export default function OrgIncidentsPage() {
  const params = useParams();
  const organizationId = String(params.organizationId);
  const base = `/org/${organizationId}`;
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener('4ds-org-session-changed', refresh);
    return () => window.removeEventListener('4ds-org-session-changed', refresh);
  }, []);

  const siteId = getOrgSession()?.activeSiteId ?? 'all';
  const incidents = useMemo(
    () => listIncidents(organizationId, siteId),
    [organizationId, siteId, tick],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return incidents;
    return incidents.filter((i) =>
      [i.id, i.type, i.subject, i.location, i.siteName, i.status, i.severity]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [incidents, query]);

  const active = filtered.filter((i) => isActive(i.status));
  const resolved = filtered.filter((i) => !isActive(i.status));

  return (
    <div className="org-page org-page--incidents inc-hud-page">
      <OrgPageHeader
        title="Incident center"
        subtitle="Live incident board for this organisation — severity, site, and response status."
      />

      <header className="inc-hud-head inc-hud-head--board">
        <div className="inc-hud-head__brand">
          <h1 className="inc-hud-head__title">
            <span className={`inc-hud-live ${active.length > 0 ? 'is-hot' : ''}`} aria-hidden>
              <i />
            </span>
            Live board
          </h1>
          <p className="inc-hud-head__count">
            {active.length} active · {resolved.length} resolved
          </p>
        </div>
      </header>

      <label className="soc-history__search">
        <span className="sr-only">Search incidents</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search incidents, site, location, status…"
        />
      </label>

      <IncidentTable
        title="Active incidents"
        subtitle="Open files needing site or control-room response."
        rows={active}
        emptyMessage={query.trim() ? 'No matching active incidents.' : 'No active incidents for this site filter.'}
        base={base}
      />

      <IncidentTable
        title="Resolved"
        subtitle="Cleared and closed incident files."
        rows={resolved}
        emptyMessage={query.trim() ? 'No matching resolved incidents.' : 'No resolved incidents yet.'}
        base={base}
        resolved
      />
    </div>
  );
}

function IncidentTable({
  title,
  subtitle,
  rows,
  emptyMessage,
  base,
  resolved = false,
}: {
  title: string;
  subtitle: string;
  rows: OrgIncident[];
  emptyMessage: string;
  base: string;
  resolved?: boolean;
}) {
  return (
    <section className="soc-history inc-monitor" aria-label={title}>
      <header className="soc-history__head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="soc-history__stats">
          <span>
            <strong>{rows.length}</strong> {resolved ? 'resolved' : 'open'}
          </span>
        </div>
      </header>

      <div className="soc-history__board ops-mon">
        <table className="ops-mon__table">
          <thead>
            <tr>
              <th>Incident</th>
              <th>Type</th>
              <th>Location</th>
              <th>Status</th>
              <th>Last seen</th>
              <th>Signal</th>
              <th className="ops-mon__actions-h">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="ops-mon__empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((incident, index) => {
                const tone = incidentTone(incident.status);
                const fill = toneFill(tone);
                const code = `IN${String(index + 1).padStart(4, '0')}`;
                return (
                  <tr key={incident.id} className={resolved ? 'is-void' : undefined}>
                    <td>
                      <div className="ops-mon__device">
                        <span className="ops-mon__icon" aria-hidden>
                          <IncidentTypeIcon type={incident.type} />
                        </span>
                        <span className="ops-mon__device-copy">
                          <strong>
                            <OpsMarqueeText>
                              {incident.type.replace(/_/g, ' ')} — {incident.subject}
                            </OpsMarqueeText>
                          </strong>
                          <em>{code}</em>
                        </span>
                      </div>
                    </td>
                    <td className="ops-mon__muted">{incident.type.replace(/_/g, ' ')}</td>
                    <td className="ops-mon__muted">{incident.siteName}</td>
                    <td>
                      <OpsStatusPill tone={tone} label={incidentStatusLabel(incident.status)} />
                    </td>
                    <td className="ops-mon__muted">
                      {formatClock(incident.createdAt)} · {incident.ageLabel}
                    </td>
                    <td>
                      <OpsSignal fill={fill} />
                    </td>
                    <td className="ops-mon__actions">
                      <OpsMonActionsMenu
                        label={`Actions for ${incident.subject}`}
                        items={incidentActions(incident, base, code)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <ul className="ops-mon__cards">
          {rows.length === 0 ? (
            <li className="ops-mon__empty">{emptyMessage}</li>
          ) : (
            rows.map((incident, index) => {
              const tone = incidentTone(incident.status);
              const fill = toneFill(tone);
              const code = `IN${String(index + 1).padStart(4, '0')}`;
              return (
                <li key={`card-${incident.id}`} className={resolved ? 'is-void' : undefined}>
                  <div className="ops-mon__device">
                    <span className="ops-mon__icon" aria-hidden>
                      <IncidentTypeIcon type={incident.type} />
                    </span>
                    <span className="ops-mon__device-copy">
                      <strong>
                        <OpsMarqueeText>
                          {incident.type.replace(/_/g, ' ')} — {incident.subject}
                        </OpsMarqueeText>
                      </strong>
                      <em>{code}</em>
                    </span>
                    <OpsMonActionsMenu
                      label={`Actions for ${incident.subject}`}
                      items={incidentActions(incident, base, code)}
                    />
                  </div>
                  <div className="ops-mon__card-meta">
                    <span>{incident.type.replace(/_/g, ' ')}</span>
                    <span>{incident.siteName}</span>
                    <span>
                      {formatClock(incident.createdAt)} · {incident.ageLabel}
                    </span>
                  </div>
                  <div className="ops-mon__card-foot">
                    <OpsStatusPill tone={tone} label={incidentStatusLabel(incident.status)} />
                    <OpsSignal fill={fill} />
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
}
