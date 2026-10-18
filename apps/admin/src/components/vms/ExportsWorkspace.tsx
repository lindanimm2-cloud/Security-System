'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { isDemoMode } from '@/lib/demo/is-demo-mode';
import { downloadBlob, logOpsAudit } from '@/lib/vms/api';
import {
  flattenCameras,
  formatDateTime,
  toDateKey,
  type ExportJob,
  type ExportJobStatus,
  type VmsTree,
} from '@/lib/vms/types';
import { ResourceTree } from './ResourceTree';

const STATUS_LABEL: Record<ExportJobStatus, string> = {
  QUEUED: 'Queued',
  RUNNING: 'Exporting',
  PAUSED: 'Paused',
  DONE: 'Completed',
  CANCELLED: 'Stopped',
  FAILED: 'Failed',
};

function localInput(ms: number) {
  const d = new Date(ms);
  return `${toDateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ExportsWorkspace({ tree, refreshKey }: { tree: VmsTree; refreshKey: number }) {
  const cameras = useMemo(() => flattenCameras(tree), [tree]);
  const [checked, setChecked] = useState<string[]>([]);
  const [start, setStart] = useState(() => localInput(Date.now() - 30 * 60_000));
  const [end, setEnd] = useState(() => localInput(Date.now() - 20 * 60_000));
  const [format, setFormat] = useState<'MP4' | 'AVI'>('MP4');
  const [incidentRef, setIncidentRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const { data, reload } = useApi(
    () => adminApi.get<ApiResponse<ExportJob[]>>('/control-room/vms/exports'),
    [refreshKey],
  );
  const jobs = data?.data ?? [];
  const active = jobs.some((j) => j.status === 'RUNNING' || j.status === 'QUEUED');

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => void reload({ silent: true }), 1500);
    return () => window.clearInterval(id);
  }, [active, reload]);

  async function queue() {
    if (!checked.length) {
      setMessage({ tone: 'err', text: 'Select at least one camera.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminApi.post<ApiResponse<ExportJob[]>>('/control-room/vms/exports', {
        items: checked.map((cameraId) => ({
          cameraId,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          format,
          incidentRef: incidentRef.trim() || undefined,
        })),
      });
      setMessage({ tone: 'ok', text: `${res.data.length} export${res.data.length === 1 ? '' : 's'} queued.` });
      setChecked([]);
      await reload({ silent: true });
    } catch (err) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Could not queue export' });
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, body?: unknown) {
    try {
      await adminApi.post(path, body);
      await reload({ silent: true });
    } catch (err) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Action failed' });
    }
  }

  function download(job: ExportJob) {
    const manifest = {
      demo: true,
      note: 'Demo export manifest. Connect a recorder integration to download real footage.',
      camera: job.cameraName,
      site: job.siteName,
      start: job.start,
      end: job.end,
      format: job.format,
      incidentRef: job.incidentRef,
      sizeMb: job.sizeMb,
      path: job.path,
      exportedBy: job.createdBy,
      exportedAt: new Date().toISOString(),
    };
    const name = job.path.split('/').pop() ?? `${job.id}.${job.format.toLowerCase()}`;
    downloadBlob(`${name}.manifest.json`, JSON.stringify(manifest, null, 2));
    void logOpsAudit('EXPORT', 'Export downloaded', job.cameraName, `${formatDateTime(job.start)} → ${formatDateTime(job.end)}`);
  }

  const allSelected = jobs.length > 0 && selected.length === jobs.length;
  const done = jobs.filter((j) => j.status === 'DONE').length;

  return (
    <div className="vms-work vms-work--exports">
      <div className="vms-work__tree vms-exp-side">
        <ResourceTree tree={tree} checked={checked} onCheck={setChecked} title={`Cameras (${checked.length})`} />
        <div className="vms-card">
          <h3>Backup range</h3>
          <label className="vms-field">
            <span>Start</span>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="vms-field">
            <span>End</span>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="vms-field">
            <span>Format</span>
            <select value={format} onChange={(e) => setFormat(e.target.value as 'MP4' | 'AVI')}>
              <option value="MP4">MP4</option>
              <option value="AVI">AVI</option>
            </select>
          </label>
          <label className="vms-field">
            <span>Incident ref (optional)</span>
            <input value={incidentRef} onChange={(e) => setIncidentRef(e.target.value)} placeholder="INC-…" maxLength={40} />
          </label>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || cameras.length === 0} onClick={() => void queue()}>
            {busy ? 'Queuing…' : checked.length ? `Back up ${checked.length} camera${checked.length === 1 ? '' : 's'}` : 'Back up'}
          </button>
          {message ? (
            <p className={message.tone === 'err' ? 'vms-error' : 'vms-ok'} role="status">
              {message.text}
            </p>
          ) : null}
        </div>
      </div>

      <section className="vms-work__main" aria-label="Export tasks">
        <div className="vms-toolbar">
          <strong>Backup tasks</strong>
          <span className="vms-muted">
            {jobs.length} task{jobs.length === 1 ? '' : 's'} · {done} completed
          </span>
          {isDemoMode() ? <span className="vms-badge">Demo</span> : null}
          <span className="vms-toolbar__spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void act('/control-room/vms/exports/bulk', { action: 'resume' })}>
            Start all
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void act('/control-room/vms/exports/bulk', { action: 'pause' })}>
            Pause all
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void act('/control-room/vms/exports/bulk', { action: 'cancel' })}>
            Stop all
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void act('/control-room/vms/exports/clear')}>
            Clear finished
          </button>
        </div>
        <div className="vms-table-wrap">
          <table className="vms-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all tasks"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? jobs.map((j) => j.id) : [])}
                  />
                </th>
                <th>Camera</th>
                <th>Start</th>
                <th>End</th>
                <th>Format</th>
                <th>Size</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Path</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="vms-muted vms-table__empty">
                    No backup tasks. Pick cameras and a time range, or use “Clip” in Playback.
                  </td>
                </tr>
              ) : null}
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${job.cameraName}`}
                      checked={selected.includes(job.id)}
                      onChange={(e) =>
                        setSelected((prev) => (e.target.checked ? [...prev, job.id] : prev.filter((x) => x !== job.id)))
                      }
                    />
                  </td>
                  <td>
                    <strong>{job.cameraName}</strong>
                    <span className="vms-sub">{job.siteName}</span>
                  </td>
                  <td>{formatDateTime(job.start)}</td>
                  <td>{formatDateTime(job.end)}</td>
                  <td>{job.format}</td>
                  <td>{job.sizeMb} MB</td>
                  <td>
                    <div className="vms-progress" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${job.progress}%` }} />
                    </div>
                    <span className="vms-sub">{job.progress}%</span>
                  </td>
                  <td>
                    <span className={`vms-status vms-status--${job.status.toLowerCase()}`}>{STATUS_LABEL[job.status]}</span>
                  </td>
                  <td className="vms-mono" title={job.path}>
                    {job.path}
                  </td>
                  <td className="vms-row-actions">
                    {job.status === 'RUNNING' || job.status === 'QUEUED' ? (
                      <button type="button" className="vms-link" onClick={() => void act(`/control-room/vms/exports/${job.id}/pause`)}>
                        Pause
                      </button>
                    ) : null}
                    {job.status === 'PAUSED' ? (
                      <button type="button" className="vms-link" onClick={() => void act(`/control-room/vms/exports/${job.id}/resume`)}>
                        Resume
                      </button>
                    ) : null}
                    {job.status !== 'DONE' && job.status !== 'CANCELLED' && job.status !== 'FAILED' ? (
                      <button type="button" className="vms-link vms-link--danger" onClick={() => void act(`/control-room/vms/exports/${job.id}/cancel`)}>
                        Stop
                      </button>
                    ) : null}
                    {job.status === 'DONE' ? (
                      <button type="button" className="vms-link" onClick={() => download(job)}>
                        Download
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected.length > 0 ? (
          <div className="vms-toolbar vms-toolbar--foot">
            <span>{selected.length} selected</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                for (const id of selected) {
                  const job = jobs.find((j) => j.id === id);
                  if (job && job.status !== 'DONE' && job.status !== 'CANCELLED') {
                    await adminApi.post(`/control-room/vms/exports/${id}/cancel`).catch(() => null);
                  }
                }
                setSelected([]);
                await reload({ silent: true });
              }}
            >
              Stop selected
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                jobs.filter((j) => selected.includes(j.id) && j.status === 'DONE').forEach(download);
              }}
            >
              Download selected
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
