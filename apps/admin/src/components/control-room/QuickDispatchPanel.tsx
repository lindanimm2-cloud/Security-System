'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { setActiveIncidentId } from '@/lib/dispatch-context';
import { officerStatusLabel } from '@/lib/officer-status';
import { incidentHref } from '@/lib/control-room-routes';
import { friendlyErrorMessage } from '@/lib/friendly-error';

import { officerUnitLabel, type DispatchOptionsData } from '@/lib/dispatch-types';

type QuickDispatchPanelProps = {
  incidentId: string;
  incidentLabel?: string;
  compact?: boolean;
  hideContext?: boolean;
  defaultExpanded?: boolean;
  onAssigned?: () => void;
  showDetailsLink?: boolean;
};

export function QuickDispatchPanel({
  incidentId,
  incidentLabel,
  compact = false,
  hideContext = false,
  defaultExpanded = true,
  onAssigned,
  showDetailsLink = true,
}: QuickDispatchPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const { data, loading, error, reload } = useApi(
    () =>
      adminApi.get<ApiResponse<DispatchOptionsData>>(
        `/control-room/dispatch/options/${incidentId}`,
      ),
    [incidentId],
  );

  useEffect(() => {
    setActiveIncidentId(incidentId);
  }, [incidentId]);

  const options = data?.data;

  const runAssign = useCallback(
    async (officerId?: string) => {
      setAssigning(officerId ?? 'auto');
      setActionError('');
      setActionMessage('');
      try {
        await adminApi.post('/control-room/dispatch/assign', { incidentId, officerId });
        setActionMessage(officerId ? 'Officer assigned.' : 'Nearest officer auto-assigned.');
        void reload({ silent: true });
        onAssigned?.();
      } catch (err) {
        setActionError(friendlyErrorMessage(err, 'action'));
      } finally {
        setAssigning(null);
      }
    },
    [incidentId, onAssigned, reload],
  );

  async function runEmergencyNotify() {
    setEscalating(true);
    setActionError('');
    setActionMessage('');
    try {
      const res = await adminApi.post<
        ApiResponse<{ alreadyNotified: boolean; message: string }>
      >('/control-room/dispatch/emergency-notify', { incidentId });
      setActionMessage(res.data?.message ?? 'Emergency alert sent.');
      void reload({ silent: true });
    } catch (err) {
      setActionError(friendlyErrorMessage(err, 'action'));
    } finally {
      setEscalating(false);
    }
  }

  if (loading && !options) {
    return (
      <div className="quick-dispatch quick-dispatch--loading">
        <LoadingSpinner label="Loading officers..." size="sm" />
      </div>
    );
  }

  if (error) {
    return <div className="quick-dispatch quick-dispatch--error">{error}</div>;
  }

  if (!options || typeof options !== 'object' || Array.isArray(options) || !options.incident) {
    return (
      <div className="quick-dispatch quick-dispatch--error">
        Dispatch options unavailable for this incident.
      </div>
    );
  }

  const noUnits = (options.availableCount ?? 0) === 0;
  const label = incidentLabel ?? `${options.incident.type} · ${options.incident.client}`;

  return (
    <div className={`quick-dispatch ${compact ? 'quick-dispatch--compact' : ''}`}>
      {!hideContext && (
        <div className="quick-dispatch__context">
          <span className="quick-dispatch__case-label">Case</span>
          <strong className="quick-dispatch__case-name">{label}</strong>
        </div>
      )}

      {!options.canDispatch && (
        <p className="quick-dispatch__status text-muted">
          {options.assignedOfficer
            ? `Assigned to ${options.assignedOfficer}`
            : `Status: ${(options.incident.status ?? 'UNKNOWN').replace(/_/g, ' ')}`}
        </p>
      )}

      {options.canDispatch && (
        <>
          {!compact && (
            <div className="quick-dispatch__actions-row">
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={assigning !== null}
                onClick={() => runAssign()}
              >
                {assigning === 'auto' ? <LoadingSpinner label="" size="sm" /> : 'Auto-assign nearest'}
              </button>
              <button
                type="button"
                className="btn-sm btn-sm--link"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Hide officers' : 'Manual assign'}
              </button>
            </div>
          )}

          {compact && (
            <button
              type="button"
              className={`btn-available quick-dispatch__available-toggle ${expanded ? 'btn-available--active' : ''}`}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Hide officers' : 'Available'}
              {!expanded && options.availableCount != null && (
                <span className="btn-available__count">{options.availableCount}</span>
              )}
            </button>
          )}

          {expanded && (
            <div className="quick-dispatch__menu">
              {compact && (
                <button
                  type="button"
                  className="btn-primary btn-sm quick-dispatch__auto"
                  disabled={assigning !== null}
                  onClick={() => runAssign()}
                >
                  {assigning === 'auto' ? <LoadingSpinner label="" size="sm" /> : 'Auto-assign nearest'}
                </button>
              )}

              {options.volunteers?.length > 0 && (
                <>
                  <p className="quick-dispatch__menu-title">
                    Officers who signalled availability ({options.volunteers.length})
                  </p>
                  <ul className="quick-dispatch__officer-list quick-dispatch__officer-list--volunteers">
                    {options.volunteers.map((v) => (
                      <li key={v.id} className="quick-dispatch__officer-row">
                        <div className="quick-dispatch__officer-info">
                          <OfficerStatusDot status={v.status} />
                          <div>
                            <strong>{v.name}</strong>
                            {officerUnitLabel(v) && (
                              <span className="quick-dispatch__unit">{officerUnitLabel(v)}</span>
                            )}
                            <span className="text-muted">
                              Signalled available
                              {v.distanceKm != null
                                ? ` · ${v.distanceKm.toFixed(1)} km · ETA ${v.eta}`
                                : v.zone
                                  ? ` · ${v.zone}`
                                  : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={assigning !== null}
                          onClick={() => runAssign(v.id)}
                        >
                          {assigning === v.id ? (
                            <LoadingSpinner label="" size="sm" />
                          ) : (
                            'Assign'
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <p className="quick-dispatch__menu-title">
                Available officers ({options.availableCount} ready)
              </p>

              {options.officers.length === 0 ? (
                <p className="text-muted">No active officers on roster.</p>
              ) : (
                <ul className="quick-dispatch__officer-list">
                  {options.officers.map((o) => (
                    <li key={o.id} className="quick-dispatch__officer-row">
                      <div className="quick-dispatch__officer-info">
                        <OfficerStatusDot status={o.status} />
                        <div>
                          <strong>{o.name}</strong>
                          {officerUnitLabel(o) && (
                            <span className="quick-dispatch__unit">{officerUnitLabel(o)}</span>
                          )}
                          <span className="text-muted">
                            {officerStatusLabel(o.status)}
                            {o.zone ? ` · ${o.zone}` : ''}
                            {o.distanceKm != null
                              ? ` · ${o.distanceKm.toFixed(1)} km · ETA ${o.eta}`
                              : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`btn-sm ${o.available ? 'btn-primary' : 'btn-sm--link'}`}
                        disabled={assigning !== null}
                        onClick={() => runAssign(o.id)}
                        title={o.available ? 'Assign officer' : 'Assign anyway (officer busy)'}
                      >
                        {assigning === o.id ? (
                          <LoadingSpinner label="" size="sm" />
                        ) : (
                          'Assign'
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {noUnits && (
                <div className="quick-dispatch__emergency">
                  <p className="quick-dispatch__emergency-text">
                    No officers are available right now. Send an emergency broadcast so the team
                    knows this incident still needs cover if you step away.
                  </p>
                  <button
                    type="button"
                    className="btn-emergency"
                    disabled={escalating || options.emergencyRaisedRecently}
                    onClick={runEmergencyNotify}
                  >
                    {escalating ? (
                      <LoadingSpinner label="" size="sm" />
                    ) : options.emergencyRaisedRecently ? (
                      'Alert sent recently'
                    ) : (
                      'Emergency notify all units'
                    )}
                  </button>
                </div>
              )}

              {!noUnits && options.officers.some((o) => !o.available) && (
                <div className="quick-dispatch__emergency quick-dispatch__emergency--secondary">
                  <button
                    type="button"
                    className="btn-sm btn-sm--link"
                    disabled={escalating || options.emergencyRaisedRecently}
                    onClick={runEmergencyNotify}
                  >
                    {options.emergencyRaisedRecently
                      ? 'Backup alert sent'
                      : 'Request backup / notify all'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {actionError && <ErrorAlert error={actionError} inline />}
      {actionMessage && <div className="alert alert--success alert--inline">{actionMessage}</div>}

      {showDetailsLink && (
        <div className="quick-dispatch__footer">
          <Link href={incidentHref(incidentId)} className="map-popup-link">
            Full incident details
          </Link>
        </div>
      )}
    </div>
  );
}
