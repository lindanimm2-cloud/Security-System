'use client';

import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';

type Audit = {
  id: string;
  action: string;
  createdAt: string;
  actor?: string;
  actorRole?: string;
  result: string;
};

type EventTone = 'ok' | 'warn' | 'danger' | 'neutral';

const EVENT_META: Record<string, { label: string; tone: EventTone }> = {
  PANIC_ACTIVATED: { label: 'Panic activated', tone: 'danger' },
  DEVICE_LOST: { label: 'Device reported lost', tone: 'warn' },
  DEVICE_STOLEN: { label: 'Device reported stolen', tone: 'warn' },
  EMERGENCY_SESSION_CREATED: { label: 'Emergency session created', tone: 'warn' },
  DEVICE_REGISTERED: { label: 'Device registered', tone: 'ok' },
  TEST_EMERGENCY_EVENT: { label: 'Controlled emergency test', tone: 'ok' },
};

export default function ActivityPage() {
  return (
    <PortalLayout>
      <ActivityContent />
    </PortalLayout>
  );
}

function ActivityContent() {
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Audit[]>>('/client/security/activity'),
    [],
  );

  const rows = useMemo(
    () =>
      [...(data?.data ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data?.data],
  );
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const meta = EVENT_META[row.action];
        return matchesSearch(
          search,
          row.action,
          meta?.label,
          row.actor,
          row.actorRole,
          row.result,
        );
      }),
    [rows, search],
  );

  if (loading) return <LoadingSpinner label="Loading activity…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="REG-ACT-01"
        kicker="Register H"
        title="Security activity"
        summary="Audited events recorded against this protection file. Newest entries appear first. This register does not include officer radio traffic."
        toc={[
          { id: 'register', label: 'Register' },
          { id: 'file', label: 'Protection file', href: '/portal/security' },
        ]}
      >
        <SecurityArticle id="register" number="01" title="Event register">
          <div className="list-search-bar list-search-bar--flush">
            <ListSearch
              value={search}
              onChange={setSearch}
              placeholder="Search activity…"
              resultCount={filtered.length}
              totalCount={rows.length}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="sec-article__note">
              {search.trim()
                ? 'No matching activity for that search.'
                : 'No security activity has been recorded yet.'}
            </p>
          ) : (
            <ol className="sec-log">
              {filtered.map((row, index) => {
                const meta = EVENT_META[row.action] ?? {
                  label: labelFor(row.action),
                  tone: 'neutral' as EventTone,
                };
                return (
                  <li key={row.id} className={`sec-log__item sec-log__item--${meta.tone}`}>
                    <span className="sec-log__n" aria-hidden>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="sec-log__body">
                      <div className="sec-log__head">
                        <strong>{meta.label}</strong>
                        <StatusBadge
                          status={row.result || meta.tone}
                          label={resultLabel(row.result)}
                          tone={toneFor(meta.tone)}
                        />
                      </div>
                      <p className="sec-log__when">{formatWhen(row.createdAt)}</p>
                      {row.actor ? (
                        <p className="sec-log__meta">
                          Recorded by {row.actor}
                          {row.actorRole ? ` · ${row.actorRole}` : ''}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </SecurityArticle>
      </SecurityDocFrame>
    </div>
  );
}

function labelFor(action: string) {
  return action.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function resultLabel(result: string) {
  if (!result) return 'Recorded';
  return result.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function toneFor(tone: EventTone) {
  if (tone === 'ok') return 'success' as const;
  if (tone === 'warn') return 'warning' as const;
  if (tone === 'danger') return 'danger' as const;
  return 'neutral' as const;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const time = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today · ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return `Yesterday · ${time}`;
  }
  return date.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
