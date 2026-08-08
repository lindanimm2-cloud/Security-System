'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { pushPriorityAlert } from '@/components/control-room/PriorityAlertProvider';
import { ThemeSettings } from '@/components/ThemeSettings';
import { ErrorAlert } from '@/components/ErrorAlert';
import type { PriorityAlert } from '@/lib/alert-priority';
import { adminApi } from '@/lib/api-client';
import { getSession } from '@/lib/auth';

const PREVIEW_ALERTS: { label: string; alert: PriorityAlert }[] = [
  {
    label: 'Panic',
    alert: {
      id: 'preview-panic',
      tier: 'critical',
      kind: 'panic',
      category: 'PANIC',
      title: '4DS-2050-SJ-00142',
      subtitle: 'Panic alert · Morningside, Durban · ACTIVE',
      link: '/control-room/map',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'Silent panic',
    alert: {
      id: 'preview-silent',
      tier: 'critical',
      kind: 'silent',
      category: 'SILENT_PANIC',
      title: '4DS-2050-JJ-00088',
      subtitle: 'Silent panic · Berea, Durban · Discreet activation',
      link: '/control-room/map',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'Medical',
    alert: {
      id: 'preview-medical',
      tier: 'high',
      kind: 'medical',
      category: 'MEDICAL',
      title: 'Medical emergency',
      subtitle: 'Ambulance requested · Westville, Durban',
      link: '/control-room/dispatch',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'Billing update',
    alert: {
      id: 'preview-low',
      tier: 'normal',
      kind: 'high',
      category: 'BILLING',
      title: 'Subscription renewed',
      subtitle: 'This stays in the notification bell only.',
      link: '/control-room/customers',
      createdAt: new Date().toISOString(),
    },
  },
];

const ROLE_GUIDE = [
  { role: 'Owner', portal: 'Control Panel', access: 'Full tenant authority, gear store CRM, users & roles' },
  { role: 'Developer', portal: 'Control Panel', access: 'Full ops/store visibility; revenue hidden until owner unlocks; error desk + support chat' },
  { role: 'Manager', portal: 'Control Panel', access: 'Operations, store, sales, teams, customers, fleet' },
  { role: 'Supervisor', portal: 'Control Panel', access: 'Dispatch oversight, map, incidents, install jobs' },
  { role: 'Sales', portal: 'Control Panel', access: 'Sales desk pipeline, store leads, customer follow-ups' },
  { role: 'Client', portal: 'Client Portal', access: 'Panic, tracking, family, subscription' },
  { role: 'Officer', portal: 'Officer App', access: 'Assignments, navigation, field reports' },
  { role: 'Technician', portal: 'Technician App', access: 'CCTV / alarm / access install jobs & status' },
];

export default function ControlRoomSettingsPage() {
  const session = getSession('admin');
  const canGrantRevenue =
    session?.user.role === 'OWNER' || session?.user.role === 'SUPER_ADMIN';
  const [revenueBusy, setRevenueBusy] = useState(false);
  const [revenueMsg, setRevenueMsg] = useState('');
  const [revenueErr, setRevenueErr] = useState('');

  async function setDeveloperRevenue(enabled: boolean) {
    setRevenueBusy(true);
    setRevenueErr('');
    setRevenueMsg('');
    try {
      const res = await adminApi.patch<{
        success: boolean;
        data: { message: string };
      }>('/developer/revenue-access', { enabled });
      setRevenueMsg(res.data.message);
    } catch (err) {
      setRevenueErr(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setRevenueBusy(false);
    }
  }

  return (
    <ControlRoomLayout title="Settings">
      <div className="page-content page-content--settings">
        <div className="page-header">
          <div>
            <h1>Settings</h1>
            <p className="text-muted">Control panel preferences and role access.</p>
          </div>
        </div>

        <div className="portal-card profile-section">
          <ThemeSettings />
        </div>

        {canGrantRevenue && (
          <div className="portal-card profile-section">
            <h2>Developer revenue access</h2>
            <p className="text-muted">
              By default the developer sees ops and inventory data but not money generated
              (store revenue, pipeline totals). Unlock after you agree terms in your contract.
            </p>
            {revenueErr && <ErrorAlert error={revenueErr} />}
            {revenueMsg && <div className="alert alert--success">{revenueMsg}</div>}
            <div className="entity-card-actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={revenueBusy}
                onClick={() => void setDeveloperRevenue(true)}
              >
                Allow developer to see revenue
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={revenueBusy}
                onClick={() => void setDeveloperRevenue(false)}
              >
                Hide revenue again
              </button>
            </div>
          </div>
        )}

        <div className="portal-card profile-section">
          <h2>Roles & access</h2>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Create and edit staff accounts under Teams & Users. Organization slug for all demos:{' '}
            <strong>demo</strong>
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Portal</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_GUIDE.map((row) => (
                  <tr key={row.role}>
                    <td><span className="badge">{row.role}</span></td>
                    <td>{row.portal}</td>
                    <td className="text-muted">{row.access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/control-room/teams" className="btn-primary btn-sm">
              Manage users & roles
            </Link>
          </div>
        </div>

        <div className="portal-card profile-section">
          <h2>Alert preview</h2>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Critical alerts use the floating lens (top left). Important alerts use centre toasts.
            Routine updates only appear in the notification bell.
          </p>
          <div className="alert-preview-row">
            {PREVIEW_ALERTS.map(({ label, alert }) => (
              <button
                key={label}
                type="button"
                className="btn-secondary btn-sm"
                onClick={() =>
                  pushPriorityAlert({
                    ...alert,
                    id: `${alert.id}-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                  })
                }
              >
                Preview {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ControlRoomLayout>
  );
}
