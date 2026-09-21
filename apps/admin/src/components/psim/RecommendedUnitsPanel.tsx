'use client';

import { DispatchMenuButton } from '@/components/control-room/DispatchMenuButton';
import {
  rankOfficersForDispatch,
  type DispatchCandidate,
  type DispatchOfficerInput,
} from '@/lib/psim/dispatch-rules';

type Props = {
  incidentId: string;
  incidentType: string;
  priority: string;
  location?: string;
  officers: DispatchOfficerInput[];
  assignedOfficer?: string | null;
  onAssigned?: () => void;
  compact?: boolean;
};

export function RecommendedUnitsPanel({
  incidentId,
  incidentType,
  priority,
  location,
  officers,
  assignedOfficer,
  onAssigned,
  compact,
}: Props) {
  if (assignedOfficer) return null;

  const candidates = rankOfficersForDispatch(officers, {
    incidentType,
    priority,
    location,
  });

  if (!candidates.length) {
    return (
      <div className="psim-units psim-units--empty">
        <p className="text-muted">No available units match this incident.</p>
      </div>
    );
  }

  return (
    <div className={`psim-units ${compact ? 'psim-units--compact' : ''}`}>
      <header className="psim-units__head">
        <strong>Recommended units</strong>
        <span className="psim-units__engine">Rules engine · zone + skills</span>
      </header>
      <ul className="psim-units__list">
        {candidates.map((c, i) => (
          <UnitRow
            key={c.officerId}
            candidate={c}
            rank={i + 1}
            incidentId={incidentId}
            onAssigned={onAssigned}
            topPick={i === 0}
          />
        ))}
      </ul>
    </div>
  );
}

function UnitRow({
  candidate,
  rank,
  incidentId,
  onAssigned,
  topPick,
}: {
  candidate: DispatchCandidate;
  rank: number;
  incidentId: string;
  onAssigned?: () => void;
  topPick?: boolean;
}) {
  return (
    <li className={`psim-units__row ${topPick ? 'psim-units__row--top' : ''}`}>
      <span className="psim-units__rank" aria-hidden>
        {rank}
      </span>
      <div className="psim-units__body">
        <strong className="psim-units__name">
          {candidate.callSign ? `${candidate.callSign} · ` : ''}
          {candidate.name}
        </strong>
        <span className="psim-units__meta">
          {candidate.zone} · {(candidate.status ?? 'UNKNOWN').replace(/_/g, ' ')}
          {candidate.etaMin ? ` · ~${candidate.etaMin} min` : ''}
        </span>
        {candidate.reasons.length > 0 ? (
          <ul className="psim-units__reasons">
            {candidate.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <DispatchMenuButton
        incidentId={incidentId}
        className={`ops-act psim-units__assign ${topPick ? 'ops-act--dispatch psim-units__assign--primary' : ''}`}
        label="Assign"
        onAssigned={onAssigned}
      />
    </li>
  );
}
