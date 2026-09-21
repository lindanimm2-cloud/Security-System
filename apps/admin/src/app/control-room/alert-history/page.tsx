'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { clearAlertHistory, listAlertHistory } from '@/lib/alert-engine';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';

export default function AlertHistoryPage() {
  return (
    <ControlRoomLayout title="Alert History">
      <AlertHistoryContent />
    </ControlRoomLayout>
  );
}

function AlertHistoryContent() {
  const [tick, setTick] = useState(0);
  const rows = useMemo(() => listAlertHistory(120), [tick]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Alert history</h1>
          <p className="text-muted">
            Local audit trail for Control Room AlertEngine actions (receive, ACK, escalate, mute, test).
          </p>
        </div>
        <div className="page-header-actions">
          <Link href={CONTROL_ROOM_ROUTES.settings} className="btn-sm">
            Alert settings
          </Link>
          <button
            type="button"
            className="btn-sm"
            onClick={() => {
              clearAlertHistory();
              setTick((n) => n + 1);
            }}
          >
            Clear history
          </button>
          <button type="button" className="btn-sm btn-primary" onClick={() => setTick((n) => n + 1)}>
            Refresh
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="dash-clear">
          <strong>No alert events yet</strong>
          <p className="text-muted">Fire a test alert from Ops settings to populate this trail.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
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
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.time}</td>
                  <td>{row.alert}</td>
                  <td>{row.actor}</td>
                  <td>{row.action}</td>
                  <td className="text-muted">{row.detail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
