'use client';

export type WorkflowStep = {
  id: string;
  label: string;
};

export function WorkflowTracker({
  steps,
  currentIndex,
  blocked,
}: {
  steps: WorkflowStep[];
  currentIndex: number;
  blocked?: boolean;
}) {
  const safeIndex = Math.max(0, currentIndex);
  return (
    <ol className="ds-workflow" aria-label="Job workflow">
      {steps.map((step, idx) => {
        const done = idx < safeIndex;
        const current = idx === safeIndex;
        const state = done ? 'done' : current ? (blocked ? 'blocked' : 'current') : 'pending';
        return (
          <li key={step.id} className={`ds-workflow__step ds-workflow__step--${state}`} data-stage={step.id}>
            <span className="ds-workflow__mark" aria-hidden>
              {done ? '✓' : current ? '●' : '○'}
            </span>
            <span className="ds-workflow__label">{step.label}</span>
            {idx < steps.length - 1 ? <span className="ds-workflow__connector" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
