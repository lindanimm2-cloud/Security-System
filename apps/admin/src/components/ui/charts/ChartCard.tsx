'use client';

import type { ReactNode } from 'react';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ChartCard({ title, subtitle, action, children, className }: ChartCardProps) {
  return (
    <section className={`ds-chart-card ${className ?? ''}`.trim()}>
      <header className="ds-chart-card__head">
        <div>
          <strong>{title}</strong>
          {subtitle ? <span className="ds-chart-card__sub">{subtitle}</span> : null}
        </div>
        {action ? <div className="ds-chart-card__action">{action}</div> : null}
      </header>
      <div className="ds-chart-card__body">{children}</div>
    </section>
  );
}
