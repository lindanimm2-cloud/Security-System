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
        <span className="text-muted">Rules engine · zone + skills</span>
      </header>
      <ul className="psim-units__list">
        {candidates.map((c, i) => (
          <UnitRow
            key={c.officerId}
            candidate={c}
            rank={i + 1}
            incidentId={incidentId}
            onAssigned={onAssigned}
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
}: {
  candidate: DispatchCandidate;
  rank: number;
  incidentId: string;
  onAssigned?: () => void;
}) {
  return (
    <li className="psim-units__row">
      <span className="psim-units__rank">{rank}</span>
      <div className="psim-units__body">
        <strong>
          {candidate.callSign ? `${candidate.callSign} · ` : ''}
          {candidate.name}
        </strong>
        <span className="text-muted">
          {candidate.zone} · {(candidate.status ?? 'UNKNOWN').replace(/_/g, ' ')}
          {candidate.etaMin ? ` · ~${candidate.etaMin} min` : ''}
        </span>
        <span className="psim-units__reasons">{candidate.reasons.join(' · ')}</span>
      </div>
      <DispatchMenuButton
        incidentId={incidentId}
        className="btn-sm psim-units__assign"
        label="Assign"
        onAssigned={onAssigned}
      />
    </li>
  );
}
