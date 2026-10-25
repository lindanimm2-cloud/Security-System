'use client';

import { useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { TempEngagement, TempEngagementStatus } from '@/lib/temp-engagements';

type EngagementRow = TempEngagement & { kindLabel: string };

export default function ControlRoomEngagementsPage() {
  return (
    <ControlRoomLayout title="Temporary engagements">
      <EngagementsContent />
    </ControlRoomLayout>
  );
}

function EngagementsContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<EngagementRow[]>>('/control-room/engagements'),
    [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const rows = data?.data ?? [];

  async function complete(id: string) {
    setBusyId(id);
    try {
      await adminApi.post(`/control-room/engagements/${id}/complete`);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ops-page">
      <header className="ops-page-header ops-page-header--compact">
        <div>
          <h1 className="ops-page-header__title">Temporary engagements</h1>
          <p className="ops-page-header__subtitle">
            Contact-form jobs with temp portal access. Close-out disables panic for the client.
          </p>
        </div>
      </header>

      {error ? <p className="login-error">{error}</p> : null}
      {loading && rows.length === 0 ? <p className="text-muted">Loading…</p> : null}

      {rows.length === 0 && !loading ? (
        <p className="text-muted">No temporary engagements yet. Submit a contact request first.</p>
      ) : (
        <div className="ops-panel">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Job</th>
                <th>Status</th>
                <th>Panic</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className="text-muted">{row.email}</div>
                  </td>
                  <td>{row.kindLabel}</td>
                  <td>{statusLabel(row.status)}</td>
                  <td>{row.panicEnabled ? 'Armed' : 'Off'}</td>
                  <td>
                    {row.status === 'ACTIVE' || row.status === 'PENDING_APP' ? (
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        disabled={busyId === row.id}
                        onClick={() => void complete(row.id)}
                      >
                        {busyId === row.id ? 'Closing…' : 'Close engagement'}
                      </button>
                    ) : (
                      <span className="text-muted">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: TempEngagementStatus) {
  return status.replace(/_/g, ' ');
}
