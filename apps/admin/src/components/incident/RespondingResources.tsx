'use client';

export type RespondingResource = {
  id: string;
  callSign: string;
  kind: 'officer' | 'ambulance' | 'fire' | 'supervisor';
  status: string;
  etaSeconds: number | null;
  lat: number | null;
  lng: number | null;
  incidentId: string;
  agency?: string;
};

function formatEta(sec: number | null) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const KIND_LABEL: Record<RespondingResource['kind'], string> = {
  officer: 'Officer',
  ambulance: 'Ambulance',
  fire: 'Fire',
  supervisor: 'Supervisor',
};

export function RespondingResources({
  resources,
  compact = false,
}: {
  resources: RespondingResource[];
  compact?: boolean;
}) {
  if (!resources.length) {
    return <p className="text-muted">No units assigned yet.</p>;
  }

  if (compact) {
    return (
      <ul className="responding-cards">
        {resources.map((row) => (
          <li key={row.id} className="responding-cards__item">
            <span className="responding-cards__unit">{row.callSign}</span>
            <span className="responding-cards__meta">
              {KIND_LABEL[row.kind]}
              <span className="responding-cards__status"> · {row.status.replace(/_/g, ' ')}</span>
              {row.etaSeconds != null ? ` · ETA ${formatEta(row.etaSeconds)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={`responding-resources ${compact ? 'responding-resources--compact' : ''}`}>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Type</th>
            <th>Status</th>
            {!compact && <th>ETA</th>}
          </tr>
        </thead>
        <tbody>
          {resources.map((row) => (
            <tr key={row.id}>
              <td>{row.callSign}</td>
              <td>{KIND_LABEL[row.kind]}</td>
              <td>{row.status.replace(/_/g, ' ')}</td>
              {!compact && <td>{formatEta(row.etaSeconds)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
