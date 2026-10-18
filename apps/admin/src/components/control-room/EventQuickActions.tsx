'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOpsDesk } from '@/components/control-room/ops-desk';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { ArcDeskEvent, ArcMonitoringFile } from '@/lib/arc-desk';
import { openCctvMiniPlayer } from '@/lib/cctv-mini-player';
import { normalizeOfficerStatus } from '@/lib/officer-status';
import type { OpsIncident } from '@/lib/ops-incident';

function zoneLabel(zone?: string | null) {
  if (!zone) return 'Ready';
  return /^zone\b/i.test(zone) ? zone : `Zone ${zone}`;
}

function isAvailableOfficer(status: string) {
  return normalizeOfficerStatus(status) === 'AVAILABLE';
}

type ToastState = { tone: 'ok' | 'danger'; title: string; body: string } | null;

type EventQuickActionsProps =
  | {
      kind: 'event';
      event: ArcDeskEvent;
      onEventChange: (event: ArcDeskEvent) => void;
    }
  | {
      kind: 'incident';
      incident: OpsIncident;
      onAssigned?: () => void;
    };

export function EventQuickActions(props: EventQuickActionsProps) {
  const desk = useOpsDesk();
  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [expandedCamId, setExpandedCamId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [file, setFile] = useState<ArcMonitoringFile | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const availableOfficers = useMemo(
    () => desk.officers.filter((o) => isAvailableOfficer(o.status)).slice(0, 6),
    [desk.officers],
  );
  const availableUnits = useMemo(() => desk.vehicles.slice(0, 4), [desk.vehicles]);

  const siteId =
    props.kind === 'event' ? props.event.propertyId : props.incident.siteId ?? null;
  const isVehicle =
    props.kind === 'incident' &&
    (props.incident.cctvKind === 'dash' || Boolean(props.incident.vehicleId));

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if ((!open && !cameraOpen) || !siteId) {
      if (!open && !cameraOpen) setFile(null);
      return;
    }
    let cancelled = false;
    void adminApi
      .get<ApiResponse<ArcMonitoringFile>>(`/control-room/sites/${siteId}/monitoring-file`)
      .then((res) => {
        if (!cancelled) setFile(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setFile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, cameraOpen, siteId]);

  useEffect(() => {
    if (!open && !cameraOpen) return;
    function onPointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (cameraRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      if (cameraOpen) setCameraOpen(false);
      else setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (cameraOpen) setCameraOpen(false);
      else setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, cameraOpen]);

  function showToast(next: ToastState) {
    setToast(next);
  }

  async function run(okTitle: string, okBody: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      showToast({ tone: 'ok', title: okTitle, body: okBody });
    } catch (err) {
      showToast({
        tone: 'danger',
        title: 'Action failed',
        body: err instanceof Error ? err.message : 'Could not complete action',
      });
    } finally {
      setBusy(false);
    }
  }

  const title =
    props.kind === 'event'
      ? props.event.reportAsType || props.event.type
      : props.incident.type;
  const subtitle =
    props.kind === 'event' ? props.event.title : props.incident.location || props.incident.user;
  const address =
    file?.address ||
    (props.kind === 'incident' ? props.incident.location : null) ||
    'Address unavailable';
  const clientName =
    file?.owner?.name ||
    file?.contacts?.[0]?.name ||
    (props.kind === 'incident' ? props.incident.user : 'Subscriber');
  const contacts =
    file?.contacts?.length
      ? file.contacts.slice(0, 3)
      : props.kind === 'incident' && props.incident.userPhone
        ? [{ name: props.incident.user, phone: props.incident.userPhone, relationship: 'Client' }]
        : file?.owner?.phone
          ? [{ name: clientName, phone: file.owner.phone, relationship: 'Primary' }]
          : [];

  const dashCams =
    props.kind === 'incident' ? (props.incident.previewCameras ?? []).slice(0, 3) : [];

  const siteCameras = useMemo(() => {
    if (props.kind === 'incident' && props.incident.previewCameras?.length) {
      return props.incident.previewCameras.map(
        (cam): CctvCamera => ({
          id: cam.id,
          name: cam.name,
          locationLabel: cam.locationLabel,
          channel: cam.channel,
          status: cam.status,
          snapshotUrl: cam.snapshotUrl,
          isLiveCapable: cam.isLiveCapable,
          isInterior: cam.isInterior,
        }),
      );
    }
    const site = desk.properties.find((item) => item.id === siteId);
    return site?.cameras ?? [];
  }, [desk.properties, props, siteId]);

  const phone =
    contacts.find((c) => c.phone)?.phone ||
    file?.owner?.phone ||
    (props.kind === 'incident' ? props.incident.userPhone : null) ||
    null;

  const medicalInfo = useMemo(() => {
    const bits: string[] = [];
    const type = (
      props.kind === 'event'
        ? `${props.event.reportAsType ?? ''} ${props.event.type}`
        : props.incident.type
    ).toUpperCase();
    if (type.includes('MEDICAL')) bits.push('Medical alarm — prioritise patient welfare.');
    if (props.kind === 'event' && props.event.requiredAction) bits.push(props.event.requiredAction);
    if (file?.accessNotes) bits.push(file.accessNotes);
    if (!bits.length) bits.push('No medical notes on file. Confirm with subscriber if unsure.');
    return bits;
  }, [file?.accessNotes, props]);

  const trackHref =
    props.kind === 'event'
      ? `/control-room/emap?site=${props.event.propertyId}`
      : props.incident.vehicleId
        ? `/control-room/map?vehicle=${props.incident.vehicleId}`
        : props.incident.siteId
          ? `/control-room/map?site=${props.incident.siteId}`
          : '/control-room/map';

  async function assignOfficer(officerId: string, officerName: string) {
    await run('Assigned', `Sent to ${officerName}`, async () => {
      if (props.kind === 'event') {
        const res = await adminApi.post<
          ApiResponse<{ event: ArcDeskEvent; incidentId?: string }>
        >(`/control-room/surveillance/events/${props.event.id}/dispatch`, {});
        if (res.data?.event) props.onEventChange(res.data.event);
        const incidentId = res.data?.incidentId;
        if (incidentId) {
          await adminApi.post('/control-room/dispatch/assign', { incidentId, officerId });
        }
      } else {
        await adminApi.post('/control-room/dispatch/assign', {
          incidentId: props.incident.id,
          officerId,
        });
        props.onAssigned?.();
      }
      desk.reload();
    });
  }

  async function assignUnit(callSign: string) {
    const officer = availableOfficers[0];
    await run('Unit notified', `Sent to ${callSign}`, async () => {
      if (props.kind === 'event') {
        const res = await adminApi.post<
          ApiResponse<{ event: ArcDeskEvent; incidentId?: string }>
        >(`/control-room/surveillance/events/${props.event.id}/dispatch`, {});
        if (res.data?.event) props.onEventChange(res.data.event);
        const incidentId = res.data?.incidentId;
        if (incidentId && officer) {
          await adminApi.post('/control-room/dispatch/assign', {
            incidentId,
            officerId: officer.id,
          });
        }
      } else if (officer) {
        await adminApi.post('/control-room/dispatch/assign', {
          incidentId: props.incident.id,
          officerId: officer.id,
        });
        props.onAssigned?.();
      }
      desk.reload();
    });
  }

  const panel =
    mounted && open
      ? createPortal(
          <>
            <button
              type="button"
              className="ops-event-desk__scrim"
              aria-label="Close action desk"
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              id={menuId}
              className="ops-event-desk"
              role="dialog"
              aria-label={`${title} quick actions`}
            >
              <header className="ops-event-desk__head">
                <div>
                  <span className="ops-event-desk__band">
                    {props.kind === 'event' ? 'ALM' : 'CASE'}
                  </span>
                  <strong>{title}</strong>
                  <p>{subtitle}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                  ×
                </button>
              </header>

              <section className="ops-event-desk__details" aria-label="Site details">
                <h3>Details</h3>
                <dl>
                  <div>
                    <dt>Address</dt>
                    <dd>{address}</dd>
                  </div>
                  <div>
                    <dt>Client</dt>
                    <dd>{clientName}</dd>
                  </div>
                  {file?.gateCode ? (
                    <div>
                      <dt>Gate</dt>
                      <dd>{file.gateCode}</dd>
                    </div>
                  ) : null}
                  {props.kind === 'incident' && props.incident.officer ? (
                    <div>
                      <dt>Assigned</dt>
                      <dd>{props.incident.officer}</dd>
                    </div>
                  ) : null}
                </dl>
                {file?.accessNotes ? <p className="ops-event-desk__note">{file.accessNotes}</p> : null}
              </section>

              {contacts.length > 0 ? (
                <section className="ops-event-desk__contacts" aria-label="Contacts">
                  <h3>Contacts</h3>
                  <ul>
                    {contacts.map((c, idx) => {
                      const phone = (c.phone ?? '').replace(/[^\d+]/g, '');
                      return (
                        <li key={`${c.name}-${idx}`}>
                          <div>
                            <strong>{c.name}</strong>
                            <span>{c.relationship || 'Contact'}</span>
                          </div>
                          {phone ? (
                            <span className="ops-event-desk__contact-actions">
                              <a href={`tel:${phone}`}>Call</a>
                              <a href={`sms:${phone}`}>Text</a>
                            </span>
                          ) : (
                            <span className="ops-event-desk__muted">No phone</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {isVehicle || dashCams.length > 0 ? (
                <section className="ops-event-desk__vehicle" aria-label="Vehicle">
                  <h3>Vehicle</h3>
                  <p>
                    {props.kind === 'incident' && props.incident.unit
                      ? props.incident.unit
                      : props.kind === 'incident' && props.incident.vehicleId
                        ? `Vehicle ${props.incident.vehicleId}`
                        : 'Linked vehicle'}
                    {props.kind === 'incident' && props.incident.gpsAvailable
                      ? ' · GPS live'
                      : ''}
                  </p>
                  {dashCams.length > 0 ? (
                    <div className="ops-event-desk__cams">
                      {dashCams.map((cam) => (
                        <button
                          key={cam.id}
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            openCctvMiniPlayer({
                              ...cam,
                              href:
                                props.kind === 'incident' && props.incident.vehicleId
                                  ? `/control-room/fleet?vehicle=${props.incident.vehicleId}`
                                  : undefined,
                            });
                            showToast({
                              tone: 'ok',
                              title: 'Dash cam open',
                              body: cam.name,
                            });
                          }}
                        >
                          {cam.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="ops-event-desk__muted">No dash cam preview on this case.</p>
                  )}
                </section>
              ) : null}

              <section className="ops-event-desk__toolbar" aria-label="Desk actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run('Resolved', 'Marked resolved', async () => {
                      if (props.kind === 'event') {
                        const res = await adminApi.post<ApiResponse<ArcDeskEvent>>(
                          `/control-room/surveillance/events/${props.event.id}/resolve`,
                          { falseAlarm: false },
                        );
                        if (res.data) props.onEventChange(res.data);
                      } else {
                        await adminApi.patch(`/control-room/incidents/${props.incident.id}`, {
                          status: 'RESOLVED',
                        });
                        props.onAssigned?.();
                      }
                      setOpen(false);
                      desk.reload();
                    })
                  }
                >
                  Resolved
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run('False alarm', 'Closed as false alarm', async () => {
                      if (props.kind === 'event') {
                        const res = await adminApi.post<ApiResponse<ArcDeskEvent>>(
                          `/control-room/surveillance/events/${props.event.id}/resolve`,
                          { falseAlarm: true },
                        );
                        if (res.data) props.onEventChange(res.data);
                      } else {
                        await adminApi.patch(`/control-room/incidents/${props.incident.id}`, {
                          status: 'CANCELLED',
                        });
                        props.onAssigned?.();
                      }
                      setOpen(false);
                      desk.reload();
                    })
                  }
                >
                  False alarm
                </button>
                <Link href={trackHref} onClick={() => setOpen(false)}>
                  Track
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setCameraOpen(true);
                    setOpen(false);
                  }}
                >
                  Open camera
                </button>
              </section>

              <section className="ops-event-desk__units" aria-label="Available units">
                <h3>Available units</h3>
                {availableOfficers.length === 0 && availableUnits.length === 0 ? (
                  <p className="ops-event-desk__muted">No units available right now.</p>
                ) : (
                  <ul>
                    {availableOfficers.map((officer) => (
                      <li key={officer.id}>
                        <div>
                          <strong>{officer.name}</strong>
                          <span>{zoneLabel(officer.zone)}</span>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void assignOfficer(officer.id, officer.name)}
                        >
                          Assign
                        </button>
                      </li>
                    ))}
                    {availableUnits.map((unit) => (
                      <li key={unit.id}>
                        <div>
                          <strong>{unit.callSign}</strong>
                          <span>{unit.registration || 'Patrol unit'}</span>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void assignUnit(unit.callSign)}
                        >
                          Send
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>,
          document.body,
        )
      : null;

  const toastNode =
    mounted && toast
      ? createPortal(
          <div
            className={`ops-action-toast ops-action-toast--${toast.tone}`}
            role="status"
            aria-live="polite"
          >
            <strong>{toast.title}</strong>
            <span>{toast.body}</span>
          </div>,
          document.body,
        )
      : null;

  const cameraPopup =
    mounted && cameraOpen
      ? createPortal(
          <>
            <button
              type="button"
              className="ops-alert-cam__scrim"
              aria-label="Close camera view"
              onClick={() => {
                setCameraOpen(false);
                setExpandedCamId(null);
              }}
            />
            <div
              ref={cameraRef}
              className="ops-alert-cam"
              role="dialog"
              aria-modal="true"
              aria-label={`${title} cameras`}
            >
              <header className="ops-alert-cam__head">
                <div>
                  <strong>{title}</strong>
                  <span>{subtitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCameraOpen(false);
                    setExpandedCamId(null);
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </header>
              <div className="ops-alert-cam__body">
                <div
                  className={`ops-alert-cam__grid ${expandedCamId ? 'ops-alert-cam__grid--solo' : ''}`}
                  aria-label="Camera grid"
                >
                  {siteCameras.length === 0 ? (
                    <p className="ops-alert-cam__empty">No cameras linked to this alert.</p>
                  ) : (
                    siteCameras.slice(0, 6).map((cam) => {
                      if (expandedCamId && expandedCamId !== cam.id) return null;
                      const expanded = expandedCamId === cam.id;
                      return (
                        <AlertCamTile
                          key={cam.id}
                          camera={cam}
                          siteId={siteId}
                          expanded={expanded}
                          onToggleExpand={() =>
                            setExpandedCamId((id) => (id === cam.id ? null : cam.id))
                          }
                        />
                      );
                    })
                  )}
                </div>
                <aside className="ops-alert-cam__side" aria-label="Incident details">
                  <h3>Details</h3>
                  <dl>
                    <div>
                      <dt>Address</dt>
                      <dd>{address}</dd>
                    </div>
                    <div>
                      <dt>Client</dt>
                      <dd>{clientName}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        {phone ? (
                          <span className="ops-alert-cam__phone">
                            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>
                            <a href={`sms:${phone.replace(/[^\d+]/g, '')}`}>Text</a>
                          </span>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                    {file?.gateCode ? (
                      <div>
                        <dt>Gate</dt>
                        <dd>{file.gateCode}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <h3>Medical</h3>
                  <ul className="ops-alert-cam__medical">
                    {medicalInfo.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  {contacts.length > 0 ? (
                    <>
                      <h3>Contacts</h3>
                      <ul className="ops-alert-cam__contacts">
                        {contacts.map((c, idx) => (
                          <li key={`${c.name}-${idx}`}>
                            <strong>{c.name}</strong>
                            <span>{c.relationship || 'Contact'}</span>
                            {c.phone ? <span>{c.phone}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </aside>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="ops-event__open"
        aria-haspopup="dialog"
        aria-expanded={open || cameraOpen}
        aria-controls={menuId}
        aria-label={props.kind === 'event' ? 'Event quick actions' : 'Incident quick actions'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {props.kind === 'event' ? 'Action' : 'Open'}
      </button>
      {panel}
      {cameraPopup}
      {toastNode}
    </>
  );
}

function AlertCamTile({
  camera,
  siteId,
  expanded,
  onToggleExpand,
}: {
  camera: CctvCamera;
  siteId?: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    function onFs() {
      setIsFs(document.fullscreenElement === tileRef.current);
    }
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (document.fullscreenElement === tileRef.current) {
        void document.exitFullscreen().catch(() => undefined);
        return;
      }
      if (expanded) onToggleExpand();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, onToggleExpand]);

  async function enterBrowserFullscreen() {
    const node = tileRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement === node) await document.exitFullscreen();
      else await node.requestFullscreen();
    } catch {
      if (!expanded) onToggleExpand();
    }
  }

  return (
    <div
      ref={tileRef}
      className={`ops-alert-cam__tile ${expanded ? 'is-expanded' : ''} ${isFs ? 'is-fs' : ''}`}
      onDoubleClick={() => void enterBrowserFullscreen()}
    >
      <div className="ops-alert-cam__tile-stage">
        <CctvLiveFeed
          camera={camera}
          compact
          showControls={false}
          onSelect={() =>
            openCctvMiniPlayer({
              ...camera,
              href: siteId ? `/control-room/surveillance/${siteId}` : undefined,
            })
          }
        />
      </div>
      <div className="ops-alert-cam__tile-bar">
        <span>{camera.name}</span>
        <button
          type="button"
          aria-label={expanded || isFs ? `Collapse ${camera.name}` : `Expand ${camera.name}`}
          title={isFs ? 'Exit fullscreen' : expanded ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation();
            if (isFs) {
              void document.exitFullscreen().catch(() => undefined);
              return;
            }
            onToggleExpand();
          }}
        >
          <ExpandIcon exit={expanded || isFs} />
        </button>
      </div>
    </div>
  );
}

function ExpandIcon({ exit }: { exit?: boolean }) {
  if (exit) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9 9H4V4M15 9h5V4M20 15v5h-5M4 15v5h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
