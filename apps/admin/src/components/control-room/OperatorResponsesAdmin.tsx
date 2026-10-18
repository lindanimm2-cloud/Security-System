'use client';

import { useEffect, useState } from 'react';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { ArcOperatorResponse } from '@/lib/arc-desk';

const DEFAULTS: ArcOperatorResponse[] = [
  { code: '1', label: 'Contacted customer', mandatory: true, sortOrder: 1, isActive: true },
  { code: '2', label: 'Verified on CCTV', mandatory: false, sortOrder: 2, isActive: true },
  { code: '3', label: 'Dispatched response', mandatory: false, sortOrder: 3, isActive: true },
  { code: '4', label: 'False alarm', mandatory: false, sortOrder: 4, isActive: true },
  { code: '5', label: 'Keyholder notified', mandatory: false, sortOrder: 5, isActive: true },
  { code: 'A', label: 'Police / emergency services', mandatory: false, sortOrder: 10, isActive: true },
  { code: 'B', label: 'Technical follow-up', mandatory: false, sortOrder: 11, isActive: true },
];

export function OperatorResponsesAdmin() {
  const [rows, setRows] = useState<ArcOperatorResponse[]>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    void adminApi
      .get<ApiResponse<ArcOperatorResponse[]>>('/control-room/operator-responses')
      .then((res) => {
        if (!cancelled && Array.isArray(res.data) && res.data.length) setRows(res.data);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await adminApi.patch<ApiResponse<ArcOperatorResponse[]>>(
        '/control-room/operator-responses',
        { responses: rows },
      );
      if (Array.isArray(res.data)) setRows(res.data);
      setMsg('Operator responses saved');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not save responses');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-card settings-panel">
      <div className="settings-panel__head">
        <div>
          <p className="settings-panel__eyebrow">ARC desk</p>
          <h2>Operator responses</h2>
          <p className="text-muted">
            Customise action codes used when closing alarms. Mandatory responses must be completed before an alarm can
            be closed.
          </p>
        </div>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
          Save responses
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Label</th>
              <th>Mandatory</th>
              <th>Active</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.code}-${index}`}>
                <td>
                  <input
                    value={row.code}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setRows((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, code: value } : item)),
                      );
                    }}
                    style={{ width: 56 }}
                  />
                </td>
                <td>
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, label: value } : item)),
                      );
                    }}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={Boolean(row.mandatory)}
                    onChange={(e) => {
                      const value = e.target.checked;
                      setRows((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, mandatory: value } : item)),
                      );
                    }}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={row.isActive !== false}
                    onChange={(e) => {
                      const value = e.target.checked;
                      setRows((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, isActive: value } : item)),
                      );
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.sortOrder ?? index + 1}
                    onChange={(e) => {
                      const value = Number(e.target.value) || index + 1;
                      setRows((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, sortOrder: value } : item)),
                      );
                    }}
                    style={{ width: 72 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="settings-panel__actions" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              {
                code: String(prev.length + 1),
                label: 'New response',
                mandatory: false,
                sortOrder: prev.length + 1,
                isActive: true,
              },
            ])
          }
        >
          Add response
        </button>
        <button type="button" className="btn-secondary" onClick={() => setRows(DEFAULTS.map((r) => ({ ...r })))}>
          Reset defaults
        </button>
      </div>

      {msg ? <p className="text-muted">{msg}</p> : null}
      {err ? <p className="form-error">{err}</p> : null}
    </section>
  );
}
