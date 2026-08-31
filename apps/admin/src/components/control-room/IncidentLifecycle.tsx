'use client';

export const INCIDENT_LIFECYCLE_STEPS = [
  'ACK',
  'VERIFY',
  'DISPATCHED',
  'EN_ROUTE',
  'ON_SCENE',
  'RESOLVED',
  'CLOSED',
] as const;

export function IncidentLifecycle({
  currentIndex,
  steps = INCIDENT_LIFECYCLE_STEPS,
}: {
  currentIndex: number;
  steps?: readonly string[];
}) {
  const safeIndex = Math.max(0, currentIndex);

  return (
    <ol className="cr-lifecycle" aria-label="Incident lifecycle">
      {steps.map((step, idx) => {
        const done = idx < safeIndex;
        const current = idx === safeIndex;
        const state = done ? 'done' : current ? 'current' : 'pending';
        return (
          <li key={step} className={`cr-lifecycle__step cr-lifecycle__step--${state}`} data-step={step}>
            <span className="cr-lifecycle__rail" aria-hidden>
              <span className="cr-lifecycle__dot" />
              {idx < steps.length - 1 ? <span className="cr-lifecycle__line" /> : null}
            </span>
            <span className="cr-lifecycle__label">{step.replace(/_/g, ' ')}</span>
          </li>
        );
      })}
    </ol>
  );
}
