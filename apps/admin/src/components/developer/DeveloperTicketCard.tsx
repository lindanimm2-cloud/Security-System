'use client';

import { useState } from 'react';
import type { DevTicket, DevWorkflowStatus } from '@/lib/developer-desk';
import {
  severityLabel,
  workflowLabel,
  WORKFLOW_ACTIONS,
} from '@/lib/developer-desk';

type Props = {
  ticket: DevTicket;
  busy: boolean;
  focused: boolean;
  duplicateCount?: number;
  onWorkflow: (status: DevWorkflowStatus) => void;
  onReproducible: (reproducible: boolean) => void;
  onMerge?: () => void;
};

export function DeveloperTicketCard({
  ticket,
  busy,
  focused,
  duplicateCount = 0,
  onWorkflow,
  onReproducible,
  onMerge,
}: Props) {
  const [showStack, setShowStack] = useState(false);
  const snap = ticket.meta.snapshot;
  const actions = WORKFLOW_ACTIONS[ticket.workflowStatus] ?? [];

  return (
    <article
      id={`dev-ticket-${ticket.id}`}
      className={`dev-incident ${focused ? 'dev-incident--focus' : ''} dev-incident--${ticket.severity.toLowerCase()} ${
        ticket.status === 'OPEN' ? 'dev-incident--open' : ''
      }`}
    >
      <div className="dev-incident__head">
        <div>
          <span className="dev-incident__code">{ticket.ticketCode}</span>
          <span className={`dev-severity dev-severity--${ticket.severity.toLowerCase()}`}>
            {ticket.severity} · {severityLabel(ticket.severity)}
          </span>
        </div>
        <span className={`dev-workflow dev-workflow--${ticket.workflowStatus.toLowerCase().replace(/_/g, '-')}`}>
          {workflowLabel(ticket.workflowStatus)}
        </span>
      </div>

      {duplicateCount > 1 ? (
        <div className="dev-incident__dup" role="status">
          <strong>{duplicateCount} similar reports detected</strong>
          {onMerge ? (
            <button type="button" className="btn-sm btn-secondary" onClick={onMerge}>
              Merge incidents
            </button>
          ) : null}
        </div>
      ) : null}

      <h3 className="dev-incident__title">{ticket.message}</h3>

      <div className="dev-incident__grid">
        <section className="dev-incident__block">
          <h4>Reported by</h4>
          <p>
            <strong>{ticket.reporter.name}</strong> · {ticket.reporter.role}
          </p>
          <p className="text-muted">{new Date(ticket.createdAt).toLocaleString()}</p>
        </section>

        {ticket.path ? (
          <section className="dev-incident__block">
            <h4>Location</h4>
            <p>{ticket.path}</p>
          </section>
        ) : null}

        {snap?.environment ? (
          <section className="dev-incident__block">
            <h4>Environment</h4>
            <p>
              {snap.environment.browser}
              <br />
              {snap.environment.os}
              <br />
              App v{snap.environment.appVersion} · Build {snap.environment.buildNumber}
            </p>
          </section>
        ) : null}
      </div>

      {snap?.error ? (
        <section className="dev-incident__block dev-incident__block--full">
          <h4>Technical details</h4>
          <dl className="dev-tech-dl">
            {snap.error.errorCode ? (
              <>
                <dt>Error code</dt>
                <dd><code>{snap.error.errorCode}</code></dd>
              </>
            ) : null}
            {snap.error.requestId ? (
              <>
                <dt>Request ID</dt>
                <dd><code>{snap.error.requestId}</code></dd>
              </>
            ) : null}
            {snap.error.apiEndpoint ? (
              <>
                <dt>API</dt>
                <dd><code>{snap.error.apiEndpoint}</code></dd>
              </>
            ) : null}
            {snap.error.httpStatus ? (
              <>
                <dt>HTTP</dt>
                <dd>{snap.error.httpStatus}</dd>
              </>
            ) : null}
          </dl>
          {snap.error.stack ? (
            <>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setShowStack((v) => !v)}
              >
                {showStack ? 'Hide stack trace' : 'View stack trace'}
              </button>
              {showStack ? <pre className="dev-incident__stack">{snap.error.stack}</pre> : null}
            </>
          ) : null}
        </section>
      ) : null}

      {ticket.meta.deployment?.firstDetectedAfter ? (
        <section className="dev-incident__deploy-hint">
          <strong>What changed?</strong>
          <p>
            Error first detected after v{ticket.meta.deployment.firstDetectedAfter} deployment.
            {ticket.meta.deployment.minutesAfterDeploy
              ? ` (${ticket.meta.deployment.minutesAfterDeploy} minutes after deploy)`
              : ''}
          </p>
          {ticket.meta.deployment.relatedFiles?.length ? (
            <ul className="dev-incident__files">
              {ticket.meta.deployment.relatedFiles.map((f) => (
                <li key={f}><code>{f}</code></li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {ticket.meta.affected ? (
        <section className="dev-incident__block dev-incident__block--full">
          <h4>Affected</h4>
          <p>
            <strong>{ticket.meta.affected.totalUsers ?? 1} user{(ticket.meta.affected.totalUsers ?? 1) === 1 ? '' : 's'}</strong>
            {ticket.meta.affected.feature ? ` · Feature: ${ticket.meta.affected.feature}` : ''}
          </p>
          {ticket.meta.affected.byRole ? (
            <p className="text-muted">
              {Object.entries(ticket.meta.affected.byRole)
                .map(([role, n]) => `${n} ${role.toLowerCase()}`)
                .join(' · ')}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="dev-incident__block dev-incident__block--full">
        <h4>Reproduction</h4>
        {ticket.meta.reproduction?.steps?.length ? (
          <ol className="dev-repro-steps">
            {ticket.meta.reproduction.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="text-muted">No reproduction steps recorded yet.</p>
        )}
        <div className="dev-incident__repro-actions">
          <button
            type="button"
            className="btn-sm btn-secondary"
            disabled={busy}
            onClick={() => onReproducible(true)}
          >
            Mark reproducible
          </button>
          <button
            type="button"
            className="btn-sm btn-ghost"
            disabled={busy}
            onClick={() => onReproducible(false)}
          >
            Unable to reproduce
          </button>
        </div>
      </section>

      {ticket.meta.fix?.rootCause || ticket.meta.fix?.filesChanged?.length ? (
        <section className="dev-incident__block dev-incident__block--full dev-incident__fix">
          <h4>Fix</h4>
          {ticket.meta.fix.rootCause ? (
            <>
              <p className="dev-incident__fix-label">Root cause</p>
              <p>{ticket.meta.fix.rootCause}</p>
            </>
          ) : null}
          {ticket.meta.fix.filesChanged?.length ? (
            <>
              <p className="dev-incident__fix-label">Files changed</p>
              <ul className="dev-incident__files">
                {ticket.meta.fix.filesChanged.map((f) => (
                  <li key={f}><code>{f}</code></li>
                ))}
              </ul>
            </>
          ) : null}
          {ticket.meta.fix.fixVersion ? (
            <p className="text-muted">Fix version: v{ticket.meta.fix.fixVersion}</p>
          ) : null}
        </section>
      ) : null}

      {ticket.meta.audit?.length ? (
        <section className="dev-incident__block dev-incident__block--full">
          <h4>Audit trail</h4>
          <ul className="dev-audit-trail">
            {ticket.meta.audit.slice().reverse().slice(0, 8).map((entry, i) => (
              <li key={`${entry.at}-${i}`}>
                <time>{new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                <span>{entry.action}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="dev-incident__actions">
        {actions.map((action) => (
          <button
            key={action.next}
            type="button"
            className={action.next === 'RESOLVED' || action.next === 'DEPLOYED' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            disabled={busy}
            onClick={() => onWorkflow(action.next)}
          >
            {action.label}
          </button>
        ))}
        {ticket.workflowStatus !== 'RESOLVED' && ticket.workflowStatus !== 'REPORTED' ? (
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy}
            onClick={() => onWorkflow('REPORTED')}
          >
            Reopen
          </button>
        ) : null}
      </div>
    </article>
  );
}
