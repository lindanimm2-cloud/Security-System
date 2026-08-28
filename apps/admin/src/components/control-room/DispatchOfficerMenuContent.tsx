'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OfficerStatusDot } from '@/components/control-room/OfficerStatusControl';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { setActiveIncidentId } from '@/lib/dispatch-context';
import {
  type DispatchOptionsData,
  officerUnitLabel,
  splitOfficersByTier,
} from '@/lib/dispatch-types';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { officerStatusLabel } from '@/lib/officer-status';
import { useCallback, useEffect, useState } from 'react';

type DispatchOfficerMenuContentProps = {
  incidentId: string;
  compact?: boolean;
  onAssigned?: () => void;
  onClose?: () => void;
};

export function DispatchOfficerMenuContent({
  incidentId,
  compact = false,
  onAssigned,
  onClose,
}: DispatchOfficerMenuContentProps) {
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
        onClose?.();
      } catch (err) {
        setActionError(friendlyErrorMessage(err, 'action'));
      } finally {
        setAssigning(null);
      }
    },
    [incidentId, onAssigned, onClose, reload],
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
      <div className="dispatch-mini-menu__loading">
        <LoadingSpinner label="Loading units..." size="sm" />
      </div>
    );
  }

  if (error) {
    return <div className="dispatch-mini-menu__error">{error}</div>;
  }

  if (!options || typeof options !== 'object' || Array.isArray(options) || !options.incident) {
    return (
      <p className="dispatch-mini-menu__status text-muted">
        Dispatch options unavailable for this incident.
      </p>
    );
  }

  const dispatchOptions = options;
  const alreadyAssigned = Boolean(dispatchOptions.assignedOfficer);

  if (!dispatchOptions.canDispatch) {
    return (
      <p className="dispatch-mini-menu__status text-muted">
        {dispatchOptions.assignedOfficer
          ? `Assigned to ${dispatchOptions.assignedOfficer}`
          : `Status: ${(dispatchOptions.incident.status ?? 'UNKNOWN').replace(/_/g, ' ')}`}
      </p>
    );
  }

  const { available, nearbyBusy } = splitOfficersByTier(dispatchOptions.officers ?? []);
  const noUnits = (dispatchOptions.availableCount ?? available.length) === 0;

  function renderOfficerRow(
    o: (typeof dispatchOptions.officers)[0],
    assignLabel = alreadyAssigned ? 'Reassign' : 'Assign',
  ) {
    const unit = officerUnitLabel(o);
    return (
      <li key={o.id} className="dispatch-mini-menu__row">
        <div className="dispatch-mini-menu__row-main">
          <OfficerStatusDot status={o.status} />
          <div>
            <strong>{o.name}</strong>
            {unit && <span className="dispatch-mini-menu__unit">{unit}</span>}
            <span className="text-muted">
              {officerStatusLabel(o.status)}
              {o.zone ? ` · ${o.zone}` : ''}
              {o.distanceKm != null ? ` · ${o.distanceKm.toFixed(1)} km · ETA ${o.eta}` : ''}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={`btn-sm ${o.available ? 'btn-primary' : 'btn-sm--link'}`}
          disabled={assigning !== null}
          onClick={() => runAssign(o.id)}
          title={o.available ? 'Assign unit' : 'Assign anyway (unit busy)'}
        >
          {assigning === o.id ? <LoadingSpinner label="" size="sm" /> : assignLabel}
        </button>
      </li>
    );
  }

  return (
    <div className={`dispatch-mini-menu__body ${compact ? 'dispatch-mini-menu__body--compact' : ''}`}>
      <div className="dispatch-mini-menu__header-row">
        <div>
          <span className="dispatch-mini-menu__eyebrow">Quick dispatch</span>
          <strong className="dispatch-mini-menu__case">
            {dispatchOptions.incident.type.replace(/_/g, ' ')} · {dispatchOptions.incident.client}
          </strong>
        </div>
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={assigning !== null}
          onClick={() => runAssign()}
        >
          {assigning === 'auto' ? (
            <LoadingSpinner label="" size="sm" />
          ) : alreadyAssigned ? (
            'Reassign nearest'
          ) : (
            'Auto'
          )}
        </button>
      </div>

      {alreadyAssigned && (
        <p className="dispatch-mini-menu__status">
          Currently assigned to {dispatchOptions.assignedOfficer}. Choose another unit to reassign.
        </p>
      )}

      {dispatchOptions.volunteers?.length > 0 && (
        <>
          <p className="dispatch-mini-menu__section">Signalled available</p>
          <ul className="dispatch-mini-menu__list">
            {dispatchOptions.volunteers.map((v) => {
              const unit = officerUnitLabel(v);
              return (
                <li key={v.id} className="dispatch-mini-menu__row">
                  <div className="dispatch-mini-menu__row-main">
                    <OfficerStatusDot status={v.status} />
                    <div>
                      <strong>{v.name}</strong>
                      {unit && <span className="dispatch-mini-menu__unit">{unit}</span>}
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
                    {assigning === v.id ? <LoadingSpinner label="" size="sm" /> : 'Assign'}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {available.length > 0 && (
        <>
          <p className="dispatch-mini-menu__section">
            Available units ({available.length}) — closest first
          </p>
          <ul className="dispatch-mini-menu__list">{available.map((o) => renderOfficerRow(o))}</ul>
        </>
      )}

      {noUnits && nearbyBusy.length > 0 && (
        <>
          <p className="dispatch-mini-menu__section">
            Nearby units en route — assign if sector cover allows
          </p>
          <ul className="dispatch-mini-menu__list">{nearbyBusy.map((o) => renderOfficerRow(o))}</ul>
        </>
      )}

      {noUnits && (
        <div className="dispatch-mini-menu__emergency">
          <p className="text-muted">
            No units are available. Notify all officers and sector supervisors.
          </p>
          <button
            type="button"
            className="btn-emergency btn-sm"
            disabled={escalating || dispatchOptions.emergencyRaisedRecently}
            onClick={runEmergencyNotify}
          >
            {escalating ? (
              <LoadingSpinner label="" size="sm" />
            ) : dispatchOptions.emergencyRaisedRecently ? (
              'Alert sent recently'
            ) : (
              'Emergency notify all'
            )}
          </button>
        </div>
      )}

      {!noUnits && nearbyBusy.length > 0 && (
        <details className="dispatch-mini-menu__busy">
          <summary>Nearby busy units ({nearbyBusy.length})</summary>
          <ul className="dispatch-mini-menu__list">{nearbyBusy.map((o) => renderOfficerRow(o))}</ul>
        </details>
      )}

      {actionError && <ErrorAlert error={actionError} inline />}
      {actionMessage && <div className="alert alert--success alert--inline">{actionMessage}</div>}
    </div>
  );
}
