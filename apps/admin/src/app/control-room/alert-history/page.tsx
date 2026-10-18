'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { VmsModal } from '@/components/vms/DeviceTools';
import { useApi } from '@/hooks/useApi';
import { clearAlertHistory, listAlertHistory } from '@/lib/alert-engine';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { openBrandedTableReport } from '@/lib/branded-document';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { isDemoMode, shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { downloadBlob } from '@/lib/vms/api';
import {
  DAY_MS,
  LEVEL_META,
  formatDateTime,
  playbackHref,
  toDateKey,
  type AlarmHistoryPage,
  type AlarmHistoryRow,
  type OpsAuditCategory,
  type OpsAuditEntry,
} from '@/lib/vms/types';

type Tab = 'latest' | 'history' | 'log' | 'engine';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'latest', label: 'Latest alarms' },
  { id: 'history', label: 'Alarm history' },
  { id: 'log', label: 'Operations log' },
  { id: 'engine', label: 'Alert engine trail' },
];

const AUDIT_CATEGORIES: Array<{ value: OpsAuditCategory | ''; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'ALARM', label: 'Alarm' },
  { value: 'PLAYBACK', label: 'Playback' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'CONFIG', label: 'Configuration' },
  { value: 'DEVICE', label: 'Device' },
  { value: 'EMAP', label: 'E-map' },
];

const AUDIT_PILL: Record<OpsAuditCategory, string> = {
  ALARM: 'vms-pill vms-pill--alarm',
  EXPORT: 'vms-pill vms-pill--export',
  PLAYBACK: 'vms-pill vms-pill--playback',
  CONFIG: 'vms-pill vms-pill--config',
  DEVICE: 'vms-pill vms-pill--device',
  EMAP: 'vms-pill vms-pill--emap',
};

function parseTab(raw: string | null): Tab {
  return raw === 'history' || raw === 'log' || raw === 'engine' ? raw : 'latest';
}

function csvCell(v: string | number | null | undefined) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: Array<Array<string | number | null>>) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

function localInput(ms: number) {
  const d = new Date(ms);
  return `${toDateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AlertHistoryPage() {
  return (
    <ControlRoomLayout title="Alarm history">
      <AlertHistoryContent />
    </ControlRoomLayout>
  );
}

function AlertHistoryContent() {
  const router = useRouter();
  const tab = parseTab(useSearchParams().get('tab'));
  const tabMeta =
    tab === 'log'
      ? 'Operator actions across alarms, playback, exports, devices and config'
      : tab === 'engine'
        ? 'Local alert-engine receive / ACK / escalate trail for this browser'
        : tab === 'history'
          ? 'Searchable alarm archive with filters and export'
          : 'Live and recent alarms awaiting operator handling';

  return (
    <div className="vms-page ah-page">
      <header className="vms-page__head">
        <div className="vms-tabs" role="tablist" aria-label="History views">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`vms-tab ${tab === t.id ? 'is-on' : ''}`}
              onClick={() =>
                router.replace(t.id === 'latest' ? CONTROL_ROOM_ROUTES.alertHistory : `${CONTROL_ROOM_ROUTES.alertHistory}?tab=${t.id}`, {
                  scroll: false,
                })
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="vms-page__meta">
          <span className="vms-muted ah-page__hint">{tabMeta}</span>
          <Link href={`${CONTROL_ROOM_ROUTES.alarmSystems}?tab=rules`} className="btn btn-ghost btn-sm">
            Camera rules
          </Link>
        </div>
      </header>
      {tab === 'latest' || tab === 'history' ? <AlarmRecords key={tab} scope={tab} /> : null}
      {tab === 'log' ? <OperationsLog /> : null}
      {tab === 'engine' ? <EngineTrail /> : null}
    </div>
  );
}

type Filters = {
  source: string;
  type: string;
  status: '' | AlarmHistoryRow['status'];
  ackBy: string;
  from: string;
  to: string;
  levels: number[];
};

function defaultFilters(): Filters {
  return {
    source: '',
    type: '',
    status: '',
    ackBy: '',
    from: localInput(new Date(new Date().setHours(0, 0, 0, 0)).getTime()),
    to: localInput(Date.now()),
    levels: [1, 2, 3, 4, 5],
  };
}

function queryString(scope: 'latest' | 'history', f: Filters, page: number, pageSize: number) {
  const p = new URLSearchParams({ scope, page: String(page), pageSize: String(pageSize), levels: f.levels.join(',') });
  if (f.source.trim()) p.set('source', f.source.trim());
  if (f.type) p.set('type', f.type);
  if (f.status) p.set('status', f.status);
  if (f.ackBy) p.set('ackBy', f.ackBy);
  if (scope === 'history') {
    p.set('from', new Date(f.from).toISOString());
    p.set('to', new Date(f.to).toISOString());
  }
  return p.toString();
}

function AlarmRecords({ scope }: { scope: 'latest' | 'history' }) {
  const [draft, setDraft] = useState<Filters>(defaultFilters);
  const [applied, setApplied] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);
  const [remark, setRemark] = useState('');
  const [detail, setDetail] = useState<AlarmHistoryRow | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const qs = queryString(scope, applied, page, pageSize);
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<AlarmHistoryPage>>(`/control-room/alarm-history?${qs}`),
    [qs],
  );
  const result = data?.data;
  const rows = result?.rows ?? [];
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  useEffect(() => {
    if (scope !== 'latest' || !shouldBackgroundPoll()) return;
    const id = window.setInterval(() => void reload({ silent: true }), 15_000);
    return () => window.clearInterval(id);
  }, [scope, reload]);

  useEffect(() => setSelected([]), [qs]);

  function quickRange(days: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const next = { ...draft, from: localInput(start.getTime() - (days - 1) * DAY_MS), to: localInput(Date.now()) };
    setDraft(next);
    setApplied(next);
    setPage(1);
  }

  async function ack(ids: string[], note: string) {
    if (!ids.length) return;
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.post('/control-room/alarm-history/ack', { ids, remark: note.trim() || null });
      setMsg({ tone: 'ok', text: `${ids.length} alarm${ids.length === 1 ? '' : 's'} acknowledged.` });
      setSelected([]);
      setRemark('');
      await reload({ silent: true });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Acknowledge failed' });
    } finally {
      setBusy(false);
    }
  }

  async function fetchAll(): Promise<AlarmHistoryRow[]> {
    const out: AlarmHistoryRow[] = [];
    for (let p = 1; p <= 20; p += 1) {
      const res = await adminApi.get<ApiResponse<AlarmHistoryPage>>(`/control-room/alarm-history?${queryString(scope, applied, p, 100)}`);
      out.push(...res.data.rows);
      if (out.length >= res.data.total || res.data.rows.length === 0) break;
    }
    return out;
  }

  const headers = ['Time', 'Level', 'Site', 'Source', 'Type', 'Status', 'Ack by', 'Ack time', 'Remarks'];
  const toRow = (r: AlarmHistoryRow) => [
    formatDateTime(r.time),
    r.level,
    r.siteName,
    r.source,
    r.type,
    r.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Not acknowledged',
    r.ackBy,
    r.ackAt ? formatDateTime(r.ackAt) : null,
    r.remarks,
  ];

  async function exportCsv() {
    const all = await fetchAll();
    downloadBlob(`alarm-${scope}-${toDateKey(new Date())}.csv`, toCsv(headers, all.map(toRow)), 'text/csv');
  }

  async function exportPdf() {
    const all = await fetchAll();
    openBrandedTableReport({
      title: scope === 'latest' ? 'Latest alarm records' : 'Alarm history',
      filenameStem: `alarm-${scope}`,
      headers,
      rows: all.map(toRow),
      notes: [
        scope === 'history' ? `Range ${formatDateTime(applied.from)} – ${formatDateTime(applied.to)}.` : 'Alarms from the last 24 hours.',
        `${all.length} record${all.length === 1 ? '' : 's'}. Use Print / Save as PDF for an archive copy.`,
      ],
    });
  }

  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <>
      <form
        className="vms-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
          setPage(1);
        }}
      >
        <label className="vms-field vms-field--wide">
          <span>Source / site</span>
          <input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="Camera, recorder or site" />
        </label>
        <label className="vms-field">
          <span>Alarm type</span>
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="">All types</option>
            {(result?.types ?? []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="vms-field">
          <span>Status</span>
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Filters['status'] })}>
            <option value="">All</option>
            <option value="NOT_ACKNOWLEDGED">Not acknowledged</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
          </select>
        </label>
        <label className="vms-field">
          <span>Acknowledged by</span>
          <select value={draft.ackBy} onChange={(e) => setDraft({ ...draft, ackBy: e.target.value })}>
            <option value="">Anyone</option>
            {(result?.ackUsers ?? []).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        {scope === 'history' ? (
          <>
            <label className="vms-field">
              <span>From</span>
              <input type="datetime-local" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
            </label>
            <label className="vms-field">
              <span>To</span>
              <input type="datetime-local" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
            </label>
            <div className="vms-seg vms-seg--sm" role="group" aria-label="Quick range">
              <button type="button" onClick={() => quickRange(1)}>
                Today
              </button>
              <button type="button" onClick={() => quickRange(3)}>
                3 days
              </button>
              <button type="button" onClick={() => quickRange(7)}>
                7 days
              </button>
            </div>
          </>
        ) : null}
        <div className="vms-field">
          <span>Alarm level</span>
          <div className="vms-chips">
            {[1, 2, 3, 4, 5].map((l) => {
              const on = draft.levels.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  className={`vms-chip ${on ? 'is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    setDraft({ ...draft, levels: on ? draft.levels.filter((x) => x !== l) : [...draft.levels, l].sort() })
                  }
                >
                  <span className={`vms-level vms-level--${LEVEL_META[l].tone}`} style={{ width: 14, height: 14, fontSize: '0.6rem' }}>
                    {l}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="vms-actions">
          <button type="submit" className="btn btn-primary btn-sm">
            Query
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const d = defaultFilters();
              setDraft(d);
              setApplied(d);
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
      </form>

      <div className="vms-toolbar">
        <span className="vms-muted">
          {result ? `${result.total} record${result.total === 1 ? '' : 's'}` : loading ? 'Loading…' : ''}
          {selected.length ? ` · ${selected.length} selected` : ''}
        </span>
        {isDemoMode() ? <span className="vms-badge">Demo</span> : null}
        <span className="vms-toolbar__spacer" />
        <input
          className="vms-input"
          style={{ maxWidth: 220 }}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Remark (optional)"
          aria-label="Acknowledgement remark"
          maxLength={200}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy || selected.length === 0}
          onClick={() => void ack(selected, remark)}
        >
          Acknowledge{selected.length ? ` (${selected.length})` : ''}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void exportCsv()} disabled={!result?.total}>
          Export CSV
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void exportPdf()} disabled={!result?.total}>
          Export PDF
        </button>
      </div>
      {msg ? (
        <p className={`vms-banner ${msg.tone === 'ok' ? 'vms-banner--info' : ''}`} role="status">
          {msg.text}
        </p>
      ) : null}
      {error ? <p className="vms-banner">{error}</p> : null}

      <div className="vms-table-wrap">
        <table className="vms-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allOnPage}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked
                        ? Array.from(new Set([...prev, ...rows.map((r) => r.id)]))
                        : prev.filter((id) => !rows.some((r) => r.id === id)),
                    )
                  }
                />
              </th>
              <th>Time</th>
              <th>Level</th>
              <th>Source</th>
              <th>Type</th>
              <th>Status</th>
              <th>Ack by</th>
              <th>Ack time</th>
              <th>Remarks</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={10} className="vms-muted vms-table__empty">
                  No alarms match these filters.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} className={selected.includes(r.id) ? 'is-selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select alarm ${r.type} at ${formatDateTime(r.time)}`}
                    checked={selected.includes(r.id)}
                    onChange={(e) =>
                      setSelected((prev) => (e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id)))
                    }
                  />
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {formatDateTime(r.time)}
                  {r.live ? <span className="vms-pill vms-pill--alarm" style={{ marginLeft: 6 }}>Live</span> : null}
                </td>
                <td>
                  <span className={`vms-level vms-level--${LEVEL_META[r.level]?.tone ?? 'l3'}`} title={LEVEL_META[r.level]?.label}>
                    {r.level}
                  </span>
                </td>
                <td>
                  <strong>{r.source}</strong>
                  <span className="vms-sub">{r.siteName}</span>
                </td>
                <td>{r.type}</td>
                <td>
                  <span className={`vms-status ${r.status === 'ACKNOWLEDGED' ? 'vms-status--acknowledged' : 'vms-status--unacknowledged'}`}>
                    {r.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Not acknowledged'}
                  </span>
                </td>
                <td>{r.ackBy ?? '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.ackAt ? formatDateTime(r.ackAt) : '—'}</td>
                <td className="vms-muted" style={{ maxWidth: 200 }}>
                  {r.remarks ?? '—'}
                </td>
                <td className="vms-row-actions">
                  <button type="button" className="vms-link" onClick={() => setDetail(r)}>
                    Details
                  </button>
                  {r.cameraId ? (
                    <Link
                      className="vms-link"
                      href={playbackHref({
                        cameraIds: [r.cameraId],
                        at: new Date(new Date(r.time).getTime() - 10_000).toISOString(),
                        siteId: r.siteId,
                      })}
                    >
                      Preview
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="vms-toolbar vms-toolbar--foot">
        <label className="vms-check">
          Rows
          <select className="vms-input" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="vms-pager">
          <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(1)}>
            «
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span>
            Page {page} / {pages}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            ›
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(pages)}>
            »
          </button>
        </div>
      </div>

      {detail ? <AlarmDetail row={detail} busy={busy} onClose={() => setDetail(null)} onAck={(note) => void ack([detail.id], note).then(() => setDetail(null))} /> : null}
    </>
  );
}

function AlarmDetail({
  row,
  busy,
  onClose,
  onAck,
}: {
  row: AlarmHistoryRow;
  busy: boolean;
  onClose: () => void;
  onAck: (remark: string) => void;
}) {
  const [note, setNote] = useState('');
  const acked = row.status === 'ACKNOWLEDGED';
  return (
    <VmsModal
      title="Alarm details"
      onClose={onClose}
      footer={
        <>
          {row.cameraId ? (
            <Link
              className="btn btn-ghost btn-sm"
              href={playbackHref({ cameraIds: [row.cameraId], at: new Date(new Date(row.time).getTime() - 10_000).toISOString(), siteId: row.siteId })}
            >
              Open playback
            </Link>
          ) : null}
          <span className="vms-toolbar__spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
          {!acked ? (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onAck(note)}>
              Acknowledge
            </button>
          ) : null}
        </>
      }
    >
      <dl className="vms-dl">
        <dt>Time</dt>
        <dd>{formatDateTime(row.time)}</dd>
        <dt>Level</dt>
        <dd>{LEVEL_META[row.level]?.label ?? row.level}</dd>
        <dt>Type</dt>
        <dd>{row.type}</dd>
        <dt>Source</dt>
        <dd>{row.source}</dd>
        <dt>Site</dt>
        <dd>{row.siteName}</dd>
        <dt>Status</dt>
        <dd>{acked ? 'Acknowledged' : 'Not acknowledged'}</dd>
        {acked ? (
          <>
            <dt>Acknowledged</dt>
            <dd>
              {row.ackBy ?? '—'} · {row.ackAt ? formatDateTime(row.ackAt) : '—'}
            </dd>
          </>
        ) : null}
        <dt>Remarks</dt>
        <dd>{row.remarks ?? '—'}</dd>
      </dl>
      {!acked ? (
        <label className="vms-field">
          <span>Remark</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="What was checked / done" />
        </label>
      ) : null}
    </VmsModal>
  );
}

function OperationsLog() {
  const [category, setCategory] = useState<OpsAuditCategory | ''>('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const qs = new URLSearchParams({ ...(category ? { category } : {}), ...(query ? { q: query } : {}) }).toString();
  const { data, loading, reload } = useApi(
    () => adminApi.get<ApiResponse<OpsAuditEntry[]>>(`/control-room/ops-audit${qs ? `?${qs}` : ''}`),
    [qs],
  );
  const rows = useMemo(() => data?.data ?? [], [data]);
  const headers = ['Time', 'User', 'Category', 'Action', 'Target', 'Detail'];
  const toRow = (r: OpsAuditEntry) => [formatDateTime(r.at), r.actor, r.category, r.action, r.target, r.detail];

  return (
    <div className="ah-desk">
      <form
        className="vms-filters ah-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <div className="ah-filters__chips" role="group" aria-label="Category filter">
          {AUDIT_CATEGORIES.map((c) => (
            <button
              key={c.value || 'all'}
              type="button"
              className={`vms-chip ${category === c.value ? 'is-on' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="ah-filters__tools">
          <input
            className="vms-input ah-filters__search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="User, camera, action…"
            aria-label="Search operations log"
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Query
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>
            Refresh
          </button>
        </div>
      </form>
      <div className="vms-toolbar ah-desk__meta">
        <span className="ah-desk__count">
          {loading ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}
        </span>
        {category ? <span className="vms-badge">{AUDIT_CATEGORIES.find((c) => c.value === category)?.label}</span> : null}
        {query ? <span className="vms-badge">“{query}”</span> : null}
        <span className="vms-muted ah-desk__note">Newest first · operator trail</span>
        <span className="vms-toolbar__spacer" />
        <div className="vms-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!rows.length}
            onClick={() => downloadBlob(`operations-log-${toDateKey(new Date())}.csv`, toCsv(headers, rows.map(toRow)), 'text/csv')}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!rows.length}
            onClick={() =>
              openBrandedTableReport({
                title: 'Control room operations log',
                filenameStem: 'operations-log',
                headers,
                rows: rows.map(toRow),
                notes: ['Who changed devices, camera settings, exports, playback and alarm handling.'],
              })
            }
          >
            Export PDF
          </button>
        </div>
      </div>
      <div className="vms-table-wrap ah-table-panel">
        <table className="vms-table ah-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Category</th>
              <th>Action</th>
              <th>Target</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="vms-muted vms-table__empty">
                  No operations logged for this filter.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="ah-cell-time">{formatDateTime(r.at)}</td>
                <td className="ah-cell-user">{r.actor}</td>
                <td>
                  <span className={AUDIT_PILL[r.category]}>{r.category}</span>
                </td>
                <td className="ah-cell-action">{r.action}</td>
                <td className="ah-cell-clip" title={r.target}>
                  {r.target}
                </td>
                <td className="vms-muted ah-cell-clip" title={r.detail ?? undefined}>
                  {r.detail ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EngineTrail() {
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => listAlertHistory(120), [tick]);

  return (
    <div className="ah-desk">
      <div className="vms-toolbar ah-desk__meta">
        <span className="ah-desk__count">
          {rows.length} {rows.length === 1 ? 'event' : 'events'}
        </span>
        <span className="vms-muted">Local receive / ACK / escalate / mute / test trail</span>
        <span className="vms-toolbar__spacer" />
        <Link href={CONTROL_ROOM_ROUTES.settings} className="btn btn-ghost btn-sm">
          Alert settings
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            clearAlertHistory();
            setTick((n) => n + 1);
          }}
        >
          Clear trail
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTick((n) => n + 1)}>
          Refresh
        </button>
      </div>
      <div className="vms-table-wrap ah-table-panel">
        <table className="vms-table ah-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Alert</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="vms-muted vms-table__empty">
                  No alert engine events yet. Fire a test alert from Ops settings to populate this trail.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="ah-cell-time">{row.time}</td>
                <td className="ah-cell-clip">{row.alert}</td>
                <td className="ah-cell-user">{row.actor}</td>
                <td className="ah-cell-action">{row.action}</td>
                <td className="vms-muted ah-cell-clip">{row.detail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
