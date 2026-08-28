'use client';

import Link from 'next/link';
import { DispatchMenuButton } from '@/components/control-room/DispatchMenuButton';
import { useNow } from '@/hooks/useNow';
import { CONTROL_ROOM_ROUTES, incidentHref } from '@/lib/control-room-routes';
import {
  primaryLensAction,
  panicSourceLabel,
  threadLabel,
  typeMixSummary,
  type LensRouteContext,
} from '@/lib/eye-lens';
import {
  cctvLabel,
  etaSnapshot,
  isPanicIncident,
  OPS_KIND_META,
  opsAlertKind,
  opsIsDispatched,
  opsPriorityLabel,
  opsResponseStatus,
  slaSnapshot,
  type OpsIncident,
} from '@/lib/ops-incident';

type Perms = {
  map: boolean;
  cctv: boolean;
  fleet: boolean;
  dispatch: boolean;
  call: boolean;
};

type Props = {
  tab: 'intel' | 'search' | 'notify';
  incidents: OpsIncident[];
  selected: OpsIncident | null;
  ackedIds: ReadonlySet<string>;
  activeCount: number;
  fieldAvailable: number;
  fieldTotal: number;
  slaCount: number;
  callBusy: boolean;
  context: LensRouteContext;
  perms: Perms;
  availableOfficers: { name: string; status: string }[];
  onSelect: (id: string) => void;
  onBack: () => void;
  onCollapse: () => void;
  onAcknowledge: (incident: OpsIncident) => void;
  onCall: (incident: OpsIncident, target: 'client' | 'officer') => void;
  onEscalate: (incident: OpsIncident) => void;
  onAssigned: () => void;
  onNavigate: (href: string) => void;
};

function formatClock(incident: OpsIncident, now: number) {
  const sla = slaSnapshot(incident, now);
  const status = opsResponseStatus(incident.status, incident.officer);
  if (sla.overdue) return { status, clock: `SLA +${sla.clock}`, overdue: true };
  return { status, clock: sla.elapsed, overdue: false };
}

export function EyeLensCriticalPanel({
  tab,
  incidents,
  selected,
  ackedIds,
  activeCount,
  fieldAvailable,
  fieldTotal,
  slaCount,
  callBusy,
  context,
  perms,
  availableOfficers,
  onSelect,
  onBack,
  onCollapse,
  onAcknowledge,
  onCall,
  onEscalate,
  onAssigned,
  onNavigate,
}: Props) {
  const now = useNow(1000, true);
  const p1Count = incidents.filter((i) => opsPriorityLabel(i.priority, i.type) === 'P1').length;
  const mix = typeMixSummary(incidents);
  const live = incidents.length > 0;

  if (tab !== 'intel') return null;

  if (selected) {
    return (
      <SelectedIncidentView
        incident={selected}
        now={now}
        acked={ackedIds.has(selected.id) || opsResponseStatus(selected.status, selected.officer) === 'ACKNOWLEDGED'}
        callBusy={callBusy}
        context={context}
        perms={perms}
        availableOfficers={availableOfficers}
        onBack={onBack}
        onCollapse={onCollapse}
        onAcknowledge={() => onAcknowledge(selected)}
        onCall={(target) => onCall(selected, target)}
        onEscalate={() => onEscalate(selected)}
        onAssigned={onAssigned}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="eye-lens-panel__body eye-lens-panel__body--queue">
      <header className="eye-lens-head">
        <div>
          <p className="eye-lens-head__title">Critical Quick Actions</p>
          <p className="eye-lens-head__sub">Needs attention now</p>
          <p className="eye-lens-head__live">
            <span className={`eye-lens-live ${live ? 'eye-lens-live--on' : ''}`} aria-hidden />
            <span>{live ? 'LIVE' : 'CLEAR'}</span>
            <span>
              {incidents.length} critical{slaCount > 0 ? ` · ${slaCount} SLA` : ''}
            </span>
          </p>
        </div>
        <button type="button" className="eye-lens-collapse" aria-label="Collapse Critical Quick Actions" title="Collapse" onClick={onCollapse}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 14l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div className="eye-lens-metrics" aria-label="Queue metrics">
        <div>
          <span>P1</span>
          <strong>{p1Count}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{activeCount}</strong>
        </div>
        <div>
          <span>Field</span>
          <strong>
            {fieldAvailable}/{Math.max(fieldTotal, fieldAvailable)}
          </strong>
        </div>
        <div>
          <span>SLA</span>
          <strong className={slaCount > 0 ? 'is-warn' : ''}>{slaCount}</strong>
        </div>
      </div>

      {incidents.length > 0 ? (
        <p className="eye-lens-mix">
          {incidents.length} critical incident{incidents.length === 1 ? '' : 's'}
          {mix ? ` · ${mix}` : ''}
        </p>
      ) : (
        <p className="eye-lens-empty">No items requiring operator attention.</p>
      )}

      {incidents.length > 0 ? (
        <section className="eye-lens-queue" aria-label="Active priority incidents">
          <h4>Active priority incidents</h4>
          <ul>
            {incidents.map((incident) => (
              <QueueCard
                key={incident.id}
                incident={incident}
                now={now}
                acked={ackedIds.has(incident.id)}
                onSelect={() => onSelect(incident.id)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function QueueCard({
  incident,
  now,
  acked,
  onSelect,
}: {
  incident: OpsIncident;
  now: number;
  acked: boolean;
  onSelect: () => void;
}) {
  const panic = isPanicIncident(incident.type);
  const kind = opsAlertKind(incident.type);
  const pri = opsPriorityLabel(incident.priority, incident.type);
  const clock = formatClock(incident, now);
  const action = primaryLensAction(incident);
  const thread = threadLabel(incident, acked);
  const source = panicSourceLabel(incident);

  return (
    <li className={`eye-qcard ${panic ? 'eye-qcard--panic' : ''} ${clock.overdue ? 'eye-qcard--sla' : ''}`}>
      <button type="button" className="eye-qcard__main" onClick={onSelect}>
        <p className="eye-qcard__pri">
          {panic ? <span aria-hidden>!</span> : null}
          {pri} · {OPS_KIND_META[kind].label}
          {source && panic ? <em>{source}</em> : null}
        </p>
        <strong>{incident.user}</strong>
        <span>{incident.location}</span>
        <p className="eye-qcard__meta">
          <b>{thread.title}</b>
          <time>{clock.overdue ? clock.clock : `${clock.status} · ${clock.clock}`}</time>
        </p>
        {incident.gpsAvailable === true ? <p className="eye-qcard__flag">Location available</p> : null}
      </button>
      <button type="button" className={`eye-qcard__act ${panic ? 'is-panic' : ''}`} onClick={onSelect}>
        {action.label}
      </button>
    </li>
  );
}

function SelectedIncidentView({
  incident,
  now,
  acked,
  callBusy,
  context,
  perms,
  availableOfficers,
  onBack,
  onCollapse,
  onAcknowledge,
  onCall,
  onEscalate,
  onAssigned,
  onNavigate,
}: {
  incident: OpsIncident;
  now: number;
  acked: boolean;
  callBusy: boolean;
  context: LensRouteContext;
  perms: Perms;
  availableOfficers: { name: string; status: string }[];
  onBack: () => void;
  onCollapse: () => void;
  onAcknowledge: () => void;
  onCall: (target: 'client' | 'officer') => void;
  onEscalate: () => void;
  onAssigned: () => void;
  onNavigate: (href: string) => void;
}) {
  const panic = isPanicIncident(incident.type);
  const kind = opsAlertKind(incident.type);
  const pri = opsPriorityLabel(incident.priority, incident.type);
  const clock = formatClock(incident, now);
  const thread = threadLabel(incident, acked);
  const source = panicSourceLabel(incident);
  const dispatched = opsIsDispatched(incident.status, incident.officer);
  const eta = etaSnapshot(incident.etaDueAt, now);
  const cctv = incident.cameraCount != null ? cctvLabel(incident) : null;
  const status = opsResponseStatus(incident.status, incident.officer);
  const mapLabel = context === 'map' ? 'Center map' : 'Map';
  const cctvAction = context === 'cctv' ? 'Open CCTV' : 'CCTV';
  const available = availableOfficers.filter((o) => o.status === 'AVAILABLE');

  return (
    <div className="eye-lens-panel__body eye-lens-panel__body--detail">
      <header className="eye-lens-head eye-lens-head--detail">
        <button type="button" className="eye-lens-back" onClick={onBack} aria-label="Back to critical queue">
          ← {OPS_KIND_META[kind].label}
        </button>
        <button type="button" className="eye-lens-collapse" aria-label="Collapse to mini-player" title="Collapse" onClick={onCollapse}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 14l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div className={`eye-detail ${panic ? 'eye-detail--panic' : ''}`}>
        <p className="eye-detail__pri">
          {panic ? <span aria-hidden>!</span> : null}
          {pri} · {OPS_KIND_META[kind].label} {thread.title}
        </p>
        <h3>{incident.user}</h3>
        <p>{incident.location}</p>
        <p className="eye-detail__clock">
          {status} · {clock.clock}
        </p>
        <ul className="eye-detail__facts">
          {incident.gpsAvailable === true ? <li>Location available</li> : incident.gpsAvailable === false ? <li>Location unavailable</li> : null}
          {source ? <li>{source}</li> : null}
          {incident.unit ? <li>{incident.unit}</li> : null}
          {incident.officer ? <li>{incident.officer}</li> : null}
          {eta && dispatched ? <li>ETA {eta.clock}</li> : null}
          {cctv ? (
            <li>
              {incident.cameraCount} camera{incident.cameraCount === 1 ? '' : 's'}
              {incident.camerasOnline != null
                ? ` · ${incident.camerasOnline} online${
                    incident.cameraCount != null && incident.cameraCount - incident.camerasOnline > 0
                      ? ` · ${incident.cameraCount - incident.camerasOnline} offline`
                      : ''
                  }`
                : ''}
            </li>
          ) : null}
        </ul>
      </div>

      {context === 'fleet' && dispatched ? (
        <p className="eye-context">
          Assigned {incident.unit ?? 'unit'}
          {incident.officer ? ` · ${incident.officer}` : ''}
          {eta ? ` · ETA ${eta.clock}` : ''}
        </p>
      ) : null}
      {context === 'fleet' && !dispatched && available.length > 0 ? (
        <p className="eye-context">
          {available.length} available unit{available.length === 1 ? '' : 's'}
        </p>
      ) : null}

      <div className="eye-actions">
        {!acked ? (
          <button type="button" className="eye-act eye-act--ack" onClick={onAcknowledge}>
            Acknowledge
          </button>
        ) : (
          <p className="eye-acked">Acknowledged</p>
        )}
        <div className="eye-actions__row">
          {perms.call ? (
            <button type="button" className="eye-act" disabled={callBusy} onClick={() => onCall('client')}>
              Call
            </button>
          ) : null}
          {perms.dispatch && !dispatched ? (
            <DispatchMenuButton
              incidentId={incident.id}
              className="eye-act"
              label="Dispatch"
              onAssigned={onAssigned}
            />
          ) : null}
          {perms.map ? (
            <button type="button" className="eye-act" onClick={() => onNavigate(`${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`)}>
              {mapLabel}
            </button>
          ) : null}
          {perms.cctv && incident.cameraCount != null ? (
            <button type="button" className="eye-act" onClick={() => onNavigate(CONTROL_ROOM_ROUTES.surveillance)}>
              {cctvAction}
            </button>
          ) : null}
        </div>
        {dispatched ? (
          <div className="eye-actions__row">
            {perms.map ? (
              <button type="button" className="eye-act" onClick={() => onNavigate(`${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`)}>
                Track
              </button>
            ) : null}
            {perms.call && incident.officer ? (
              <button type="button" className="eye-act" disabled={callBusy} onClick={() => onCall('officer')}>
                Call officer
              </button>
            ) : null}
          </div>
        ) : null}
        {context === 'incident' ? (
          <button type="button" className="eye-act" onClick={onEscalate}>
            Escalate
          </button>
        ) : null}
        <Link href={incidentHref(incident.id)} className="eye-act eye-act--full" onClick={() => onNavigate(incidentHref(incident.id))}>
          Open full incident
        </Link>
      </div>
    </div>
  );
}

export function EyeLensMiniPlayer({
  incident,
  acked,
  callBusy,
  perms,
  onOpen,
  onCall,
  onAssigned,
  onNavigate,
}: {
  incident: OpsIncident;
  acked: boolean;
  callBusy: boolean;
  perms: Perms;
  onOpen: () => void;
  onCall: (target: 'client' | 'officer') => void;
  onAssigned: () => void;
  onNavigate: (href: string) => void;
}) {
  const now = useNow(1000, true);
  const panic = isPanicIncident(incident.type);
  const clock = formatClock(incident, now);
  const thread = threadLabel(incident, acked);
  const dispatched = opsIsDispatched(incident.status, incident.officer);
  const eta = etaSnapshot(incident.etaDueAt, now);

  return (
    <div className={`eye-mini ${panic ? 'eye-mini--panic' : ''} ${thread.key === 'dispatched' ? 'eye-mini--unit' : ''}`}>
      <button type="button" className="eye-mini__main" onClick={onOpen}>
        <strong>
          {thread.title} · {incident.user}
        </strong>
        <span>
          {dispatched && incident.unit
            ? `${incident.unit}${eta ? ` · ETA ${eta.clock}` : ''}`
            : `${clock.status} · ${clock.clock}`}
        </span>
      </button>
      <div className="eye-mini__acts">
        {perms.call ? (
          <button type="button" disabled={callBusy} onClick={() => onCall(dispatched && incident.officer ? 'officer' : 'client')}>
            {dispatched && incident.officer ? 'Call officer' : 'Call'}
          </button>
        ) : null}
        {perms.dispatch && !dispatched ? (
          <DispatchMenuButton incidentId={incident.id} className="eye-mini__dispatch" label="Dispatch" onAssigned={onAssigned} />
        ) : perms.map ? (
          <button type="button" onClick={() => onNavigate(`${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`)}>
            {dispatched ? 'Track' : 'Map'}
          </button>
        ) : null}
        {perms.map && !dispatched ? (
          <button type="button" onClick={() => onNavigate(`${CONTROL_ROOM_ROUTES.map}?incident=${incident.id}`)}>
            Map
          </button>
        ) : null}
      </div>
    </div>
  );
}
