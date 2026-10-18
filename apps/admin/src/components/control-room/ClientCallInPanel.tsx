'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOpsDesk } from '@/components/control-room/ops-desk';
import { CctvLiveFeed, type CctvCamera } from '@/components/portal/CctvLiveFeed';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { ArcMonitoringFile } from '@/lib/arc-desk';
import { openCctvMiniPlayer } from '@/lib/cctv-mini-player';
import { customerHref, incidentHref } from '@/lib/control-room-routes';
import { friendlyErrorMessage } from '@/lib/friendly-error';

export type CallInClient = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
};

const INCIDENT_TYPES = ['PANIC', 'ALARM', 'INTRUSION', 'MEDICAL', 'FIRE', 'OTHER'] as const;

type SiteRow = {
  id: string;
  name: string;
  address?: string;
  client?: { id?: string; name?: string; phone?: string | null };
  owner?: { id?: string; name?: string; phone?: string | null };
  cameras?: CctvCamera[];
};

type VehicleRow = {
  id: string;
  callSign?: string;
  registration?: string;
  make?: string;
  model?: string;
  ownerId?: string;
  owner?: string;
  cameras?: CctvCamera[];
};

export function ClientCallInPanel({
  client,
  onClose,
  onCreated,
}: {
  client: CallInClient;
  onClose: () => void;
  onCreated?: (incidentId: string) => void;
}) {
  const desk = useOpsDesk();
  const [mounted, setMounted] = useState(false);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [file, setFile] = useState<ArcMonitoringFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [incidentType, setIncidentType] = useState<(typeof INCIDENT_TYPES)[number]>('PANIC');
  const [note, setNote] = useState('Phone call-in — panic not activated');

  const fullName = `${client.firstName} ${client.lastName}`.trim();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      adminApi.get<ApiResponse<{ sites?: SiteRow[] }>>('/control-room/surveillance'),
      adminApi.get<ApiResponse<VehicleRow[]>>('/control-room/client-vehicles'),
    ])
      .then(([surveillance, clientVehicles]) => {
        if (cancelled) return;
        const allSites = surveillance.data?.sites ?? [];
        const matched = allSites.filter((site) => {
          const ownerId = site.client?.id ?? site.owner?.id;
          if (ownerId && ownerId === client.id) return true;
          const ownerName = (site.client?.name ?? site.owner?.name ?? '').toLowerCase();
          const siteName = site.name.toLowerCase();
          const needle = fullName.toLowerCase();
          const last = client.lastName.toLowerCase();
          return (
            ownerName.includes(needle) ||
            ownerName.includes(last) ||
            siteName.includes(last) ||
            siteName.includes(client.firstName.toLowerCase())
          );
        });
        setSites(matched);
        const vehicleRows = clientVehicles.data ?? [];
        setVehicles(
          vehicleRows.filter((v) => {
            if (v.ownerId && v.ownerId === client.id) return true;
            const owner = (v.owner ?? '').toLowerCase();
            return owner.includes(fullName.toLowerCase()) || owner.includes(client.lastName.toLowerCase());
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSites([]);
          setVehicles([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client.id, client.firstName, client.lastName, fullName]);

  const primarySite = sites[0] ?? null;
  const phone = (
    client.phone ||
    file?.owner?.phone ||
    primarySite?.client?.phone ||
    primarySite?.owner?.phone ||
    ''
  ).trim();

  useEffect(() => {
    if (!primarySite?.id) {
      setFile(null);
      return;
    }
    let cancelled = false;
    void adminApi
      .get<ApiResponse<ArcMonitoringFile>>(`/control-room/sites/${primarySite.id}/monitoring-file`)
      .then((res) => {
        if (!cancelled) setFile(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setFile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [primarySite?.id]);

  const cameras = useMemo(() => {
    const fromSites = sites.flatMap((site) => site.cameras ?? []);
    if (fromSites.length) return fromSites.slice(0, 6);
    const deskSite = desk.properties.find((p) => p.id === primarySite?.id);
    return (deskSite?.cameras ?? []).slice(0, 6);
  }, [sites, desk.properties, primarySite?.id]);

  const address = file?.address || primarySite?.address || 'Address not on file';

  async function createIncident() {
    setBusy(true);
    setError('');
    try {
      const res = await adminApi.post<ApiResponse<{ id: string }>>('/control-room/incidents', {
        userId: client.id,
        type: incidentType,
        title: `${incidentType} — ${fullName} (call-in)`,
        address,
        priority: incidentType === 'PANIC' || incidentType === 'MEDICAL' || incidentType === 'FIRE' ? 'CRITICAL' : 'HIGH',
        description: note.trim() || 'Phone call-in — panic not activated',
        isSilent: false,
      });
      const id = res.data?.id;
      setToast(id ? 'Incident created' : 'Incident logged');
      desk.reload();
      if (id) onCreated?.(id);
    } catch (err) {
      setError(friendlyErrorMessage(err, 'action'));
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <button type="button" className="ops-callin__scrim" aria-label="Close client profile" onClick={onClose} />
      <div className="ops-callin" role="dialog" aria-modal="true" aria-label={`Client ${fullName}`}>
        <header className="ops-callin__head">
          <div>
            <span className="ops-callin__tag">Client call-in</span>
            <strong>{fullName}</strong>
            <p>{client.email || 'No email on file'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="ops-callin__body">
          <section className="ops-callin__details">
            <h3>Profile</h3>
            <dl>
              <div>
                <dt>Phone</dt>
                <dd>
                  {phone ? (
                    <span className="ops-callin__phone">
                      <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>
                      <a href={`sms:${phone.replace(/[^\d+]/g, '')}`}>Text</a>
                    </span>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{address}</dd>
              </div>
              {file?.gateCode ? (
                <div>
                  <dt>Gate</dt>
                  <dd>{file.gateCode}</dd>
                </div>
              ) : null}
              {file?.accessNotes ? (
                <div>
                  <dt>Access</dt>
                  <dd>{file.accessNotes}</dd>
                </div>
              ) : null}
            </dl>
            <div className="ops-callin__links">
              <Link href={customerHref(client.id)} onClick={onClose}>
                Full customer file
              </Link>
              {primarySite ? (
                <Link href={`/control-room/surveillance/${primarySite.id}`} onClick={onClose}>
                  Open CCTV
                </Link>
              ) : null}
              {vehicles[0] ? (
                <Link href={`/control-room/fleet?vehicle=${vehicles[0].id}`} onClick={onClose}>
                  Fleet / dash cams
                </Link>
              ) : null}
            </div>
          </section>

          <section className="ops-callin__media" aria-label="House and vehicle cameras">
            <h3>House CCTV</h3>
            {cameras.length === 0 ? (
              <p className="ops-callin__muted">No house cameras linked.</p>
            ) : (
              <div className="ops-callin__grid">
                {cameras.map((cam) => (
                  <div key={cam.id} className="ops-callin__tile">
                    <CctvLiveFeed
                      camera={cam}
                      compact
                      showControls={false}
                      onSelect={() =>
                        openCctvMiniPlayer({
                          ...cam,
                          href: primarySite ? `/control-room/surveillance/${primarySite.id}` : undefined,
                        })
                      }
                    />
                    <span>{cam.name}</span>
                  </div>
                ))}
              </div>
            )}

            <h3>Vehicles / dash cam</h3>
            {vehicles.length === 0 ? (
              <p className="ops-callin__muted">No vehicles on file.</p>
            ) : (
              <ul className="ops-callin__vehicles">
                {vehicles.map((v) => {
                  const dash = v.cameras?.[0];
                  return (
                    <li key={v.id}>
                      <div>
                        <strong>
                          {[v.make, v.model].filter(Boolean).join(' ') || v.registration || 'Vehicle'}
                        </strong>
                        <span>{v.registration || 'Dash cam unit'}</span>
                      </div>
                      <div className="ops-callin__vehicle-actions">
                        {dash ? (
                          <button
                            type="button"
                            onClick={() =>
                              openCctvMiniPlayer({
                                ...dash,
                                href: `/control-room/fleet?vehicle=${v.id}`,
                              })
                            }
                          >
                            Dash cam
                          </button>
                        ) : null}
                        <Link href={`/control-room/fleet?vehicle=${v.id}`} onClick={onClose}>
                          Open
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="ops-callin__create" aria-label="Create incident">
            <h3>Create incident</h3>
            <p className="ops-callin__muted">
              Use when the client called in and did not trigger panic on the app.
            </p>
            <label>
              <span>Type</span>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as (typeof INCIDENT_TYPES)[number])}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Notes</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Call details, location confirmed, etc."
              />
            </label>
            {error ? <p className="ops-callin__error">{error}</p> : null}
            {toast ? <p className="ops-callin__ok">{toast}</p> : null}
            <div className="ops-callin__actions">
              <button type="button" className="ops-callin__primary" disabled={busy} onClick={() => void createIncident()}>
                {busy ? 'Creating…' : 'Create incident'}
              </button>
              {toast ? (
                <Link href={incidentHref()} onClick={onClose}>
                  Open incidents
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </>,
    document.body,
  );
}
