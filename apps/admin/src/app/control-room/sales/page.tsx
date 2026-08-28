'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { UiSelect } from '@/components/ui/UiSelect';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { matchesSearch } from '@/lib/list-search';

type Lead = {
  id: string;
  companyName: string | null;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  source: string;
  status: string;
  interest: string | null;
  estimatedCents: number | null;
  estimatedFormatted: string | null;
  notes: string | null;
  nextFollowUp: string | null;
  ownerName: string;
  ownerUserId: string | null;
};

type SalesDash = {
  stats: {
    openLeads: number;
    wonDeals: number;
    pipelineFormatted: string;
    wonFormatted: string;
    orders: number;
    catalogSize: number;
    pipeline: Record<string, number>;
  };
  leads: Lead[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    totalFormatted: string;
  }[];
};

type SalesUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST'];

export default function SalesCrmPage() {
  return (
    <ControlRoomLayout title="Sales desk">
      <SalesCrmContent />
    </ControlRoomLayout>
  );
}

function SalesCrmContent() {
  const session = getSession('admin');
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<SalesDash>>('/store/sales/dashboard'),
    [],
  );
  const { data: usersRes } = useApi(
    () => adminApi.get<ApiResponse<SalesUser[]>>('/store/sales/users'),
    [],
  );
  const { data: billingRes } = useApi(
    () =>
      adminApi.get<
        ApiResponse<{ pastDueCount: number; revenueAtRiskFormatted: string }>
      >('/control-room/billing/overview'),
    [],
  );

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    id: '',
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    source: 'Manual',
    status: 'NEW',
    interest: '',
    estimatedCents: 0,
    notes: '',
    nextFollowUp: '',
    ownerUserId: session?.user.id ?? '',
  });

  function editLead(lead: Lead) {
    setForm({
      id: lead.id,
      companyName: lead.companyName ?? '',
      contactName: lead.contactName,
      contactEmail: lead.contactEmail ?? '',
      contactPhone: lead.contactPhone ?? '',
      source: lead.source,
      status: lead.status,
      interest: lead.interest ?? '',
      estimatedCents: lead.estimatedCents ?? 0,
      notes: lead.notes ?? '',
      nextFollowUp: lead.nextFollowUp
        ? lead.nextFollowUp.slice(0, 16)
        : '',
      ownerUserId: lead.ownerUserId ?? session?.user.id ?? '',
    });
    setFormOpen(true);
  }

  function openCreateForm() {
    resetForm();
    setFormOpen(true);
  }

  function closeFormDialog() {
    resetForm();
    setFormOpen(false);
    setFormError('');
  }

  function resetForm() {
    setForm({
      id: '',
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      source: 'Manual',
      status: 'NEW',
      interest: '',
      estimatedCents: 0,
      notes: '',
      nextFollowUp: '',
      ownerUserId: session?.user.id ?? '',
    });
  }

  async function saveLead(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await adminApi.post('/store/sales/leads', {
        ...(form.id ? { id: form.id } : {}),
        companyName: form.companyName || null,
        contactName: form.contactName,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        source: form.source,
        status: form.status,
        interest: form.interest || null,
        estimatedCents: Number(form.estimatedCents) || null,
        notes: form.notes || null,
        nextFollowUp: form.nextFollowUp || null,
        ownerUserId: form.ownerUserId || null,
      });
      closeFormDialog();
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const dash = data?.data;
  const filteredLeads = useMemo(
    () =>
      (dash?.leads ?? []).filter((lead) =>
        matchesSearch(
          search,
          lead.contactName,
          lead.companyName,
          lead.contactEmail,
          lead.contactPhone,
          lead.interest,
          lead.ownerName,
          lead.status,
          lead.source,
        ),
      ),
    [dash?.leads, search],
  );
  const filteredOrders = useMemo(
    () =>
      (dash?.recentOrders ?? []).filter((o) =>
        matchesSearch(search, o.orderNumber, o.customerName, o.status, o.id),
      ),
    [dash?.recentOrders, search],
  );

  if (loading) return <LoadingSpinner label="Loading sales CRM..." />;
  if (error || !data?.data) {
    return <ErrorAlert message={error ?? 'Failed to load'} onRetry={reload} />;
  }

  const { stats, leads, recentOrders } = data.data;
  const isSales = session?.user.role === 'SALES';
  const pastDueCount = billingRes?.data?.pastDueCount ?? 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted">
            {isSales
              ? 'Your pipeline, gear store leads, and follow-ups.'
              : 'Sales pipeline for gear, CCTV kits, and security packages.'}
          </p>
        </div>
      </div>

      {pastDueCount > 0 && (
        <div className="alert alert--error" role="status">
          {pastDueCount} subscription{pastDueCount === 1 ? '' : 's'} past due
          {billingRes?.data?.revenueAtRiskFormatted
            ? ` · ${billingRes.data.revenueAtRiskFormatted} at risk`
            : ''}
          .{' '}
          <Link href={`${CONTROL_ROOM_ROUTES.customers}?filter=PAST_DUE`} className="interactive-text">
            View past-due customers →
          </Link>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Open leads</span>
          <strong className="stat-value">{stats.openLeads}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pipeline value</span>
          <strong className="stat-value">{stats.pipelineFormatted}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Won</span>
          <strong className="stat-value">{stats.wonFormatted}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Store orders</span>
          <strong className="stat-value">{stats.orders}</strong>
        </div>
      </div>

      <div className="pipeline-strip">
        {Object.entries(stats.pipeline).map(([k, v]) => (
          <div key={k} className="pipeline-chip">
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      <div className="card-panel page-section">
          <div className="card-header-row card-header-row--panel">
            <h2>Pipeline ({filteredLeads.length})</h2>
            <button type="button" className="btn-primary btn-sm" onClick={openCreateForm}>
              + New lead
            </button>
          </div>
          <div className="list-search-bar">
            <ListSearch
              value={search}
              onChange={setSearch}
              placeholder="Search leads, company, orders…"
              resultCount={filteredLeads.length + filteredOrders.length}
              totalCount={leads.length + recentOrders.length}
            />
          </div>
          {filteredLeads.length === 0 ? (
            <EmptyState
              title={search.trim() ? 'No matches' : 'No leads'}
              body={search.trim() ? 'Try another name, company, or interest.' : 'Create a lead to start the pipeline.'}
            />
          ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th>Owner</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div>{lead.contactName}</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                        {lead.companyName ?? lead.interest ?? lead.source}
                      </div>
                    </td>
                    <td>
                      <span className="badge">{lead.status}</span>
                    </td>
                    <td>{lead.estimatedFormatted ?? '—'}</td>
                    <td>{lead.ownerName}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => editLead(lead)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          <h3 className="card-panel__subsection">Recent store orders</h3>
          {filteredOrders.length === 0 ? (
            <p className="text-muted">{search.trim() ? 'No matching orders.' : 'No recent orders.'}</p>
          ) : (
          <ul className="ds-insight-list">
            {filteredOrders.map((o) => (
              <li key={o.id} className="ds-insight-row">
                <div className="ds-insight-row__copy">
                  <strong>{o.orderNumber}</strong>
                  <span>{o.customerName}</span>
                </div>
                <div className="ds-insight-row__meta" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{o.totalFormatted}</span>
                  <span className="badge">{o.status}</span>
                </div>
              </li>
            ))}
          </ul>
          )}
      </div>

      {formOpen && (
        <OpsDialog
          title={form.id ? 'Edit lead' : 'New lead'}
          subtitle={
            form.id
              ? 'Update pipeline details and follow-up.'
              : 'Add a gear store or security package lead.'
          }
          onClose={closeFormDialog}
          wide
        >
          {formError && <ErrorAlert message={formError} />}
          <form className="stack-form" onSubmit={saveLead}>
            <label>
              Company
              <input
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
              />
            </label>
            <label>
              Contact name
              <input
                required
                value={form.contactName}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
              />
            </label>
            <label>
              Phone
              <input
                value={form.contactPhone}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
              />
            </label>
            <label>
              Interest
              <input
                value={form.interest}
                onChange={(e) =>
                  setForm({ ...form, interest: e.target.value })
                }
                placeholder="CCTV kit, vests, firearms..."
              />
            </label>
            <label>
              Estimated value (cents)
              <input
                type="number"
                min={0}
                value={form.estimatedCents}
                onChange={(e) =>
                  setForm({
                    ...form,
                    estimatedCents: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Status
              <UiSelect
                compact={false}
                ariaLabel="Lead status"
                value={form.status}
                onChange={(status) => setForm({ ...form, status })}
                options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </label>
            <label>
              Owner
              <UiSelect
                compact={false}
                ariaLabel="Lead owner"
                value={form.ownerUserId}
                onChange={(ownerUserId) => setForm({ ...form, ownerUserId })}
                options={(usersRes?.data ?? []).map((u) => ({
                  value: u.id,
                  label: `${u.firstName} ${u.lastName}`,
                  meta: u.role,
                }))}
              />
            </label>
            <label>
              Next follow-up
              <input
                type="datetime-local"
                value={form.nextFollowUp}
                onChange={(e) =>
                  setForm({ ...form, nextFollowUp: e.target.value })
                }
              />
            </label>
            <label>
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <div className="fleet-form__actions">
              <button type="button" className="btn-ghost" onClick={closeFormDialog}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : form.id ? 'Update lead' : 'Create lead'}
              </button>
            </div>
          </form>
        </OpsDialog>
      )}
    </div>
  );
}
