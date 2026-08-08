'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { CoverageBadges, SubscriptionBadge } from '@/components/control-room/SubscriptionBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { CONTROL_ROOM_ROUTES, dispatchHref, mapHref } from '@/lib/control-room-routes';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { exportCsv } from '@/lib/export-csv';

type SubscriptionSummary = {
  planName: string;
  tierCode: string;
  tierLabel: string;
  addons: string[];
  activeAddonDetails: { code: string; name: string; priceFormatted: string }[];
  status: string;
  priceFormatted: string;
  memberId: string;
  validUntil: string;
  lastPaidAt?: string | null;
  nextBillingAt?: string | null;
  billingFailedCount?: number;
  isOverdue?: boolean;
  daysPastDue?: number;
  amountDueFormatted?: string;
  access: Record<string, boolean>;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  incidentCount: number;
  vehicleCount: number;
  propertyCount: number;
  subscription: SubscriptionSummary | null;
};

type CustomersResponse = {
  data: Customer[];
  stats: { total: number; premium: number; pastDue: number; active: number };
};

type BillingOverview = {
  totalSubscriptions: number;
  active: number;
  pastDueCount: number;
  revenueAtRiskFormatted: string;
  mrrFormatted: string;
};

type PlansCatalog = {
  tiers: { code: string; name: string; priceFormatted: string; description: string }[];
  addons: { code: string; name: string; priceFormatted: string; description: string; category: string }[];
};

type CustomerDetail = {
  customer: Customer & { roleLabel?: string };
  subscription: SubscriptionSummary;
  payments: {
    id: string;
    reference: string;
    amountFormatted: string;
    status: string;
    kind?: string;
    createdAt: string;
  }[];
};

type LoyaltySummary = {
  tier: string;
  tierName: string;
  points: number;
  tierDiscountPercent: number;
  manualDiscountPercent: number;
  effectiveDiscountPercent: number;
  activePromoCode: string | null;
  benefits: string;
  notes: string | null;
  nextTierName: string | null;
  pointsToNext: number;
};

type DiscountCodeRow = {
  id: string;
  code: string;
  percentOff: number;
  appliesTo: string;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  description: string | null;
};

export default function CustomersPage() {
  return (
    <ControlRoomLayout title="Customers & Subscriptions">
      <CustomersContent />
    </ControlRoomLayout>
  );
}

function CustomersContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<CustomersResponse>('/control-room/customers'),
    [],
  );
  const { data: plansData } = useApi(
    () => adminApi.get<ApiResponse<PlansCatalog>>('/control-room/subscription/plans'),
    [],
  );
  const { data: billingRes, reload: reloadBilling } = useApi(
    () => adminApi.get<ApiResponse<BillingOverview>>('/control-room/billing/overview'),
    [],
  );
  const { data: codesRes, reload: reloadCodes } = useApi(
    () => adminApi.get<ApiResponse<DiscountCodeRow[]>>('/control-room/discount-codes'),
    [],
  );

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(
    filterParam === 'PAST_DUE' ? 'PAST_DUE' : 'ALL',
  );
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('customer'));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');
  const [newCode, setNewCode] = useState({ code: '', percentOff: '10', appliesTo: 'BOTH', description: '' });
  const [codeSaving, setCodeSaving] = useState(false);
  const [codeMsg, setCodeMsg] = useState('');
  const [codeError, setCodeError] = useState('');
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [createdInvite, setCreatedInvite] = useState<{
    name: string;
    code: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (filterParam === 'PAST_DUE') setStatusFilter('PAST_DUE');
  }, [filterParam]);

  const customers = data?.data ?? [];
  const stats = data?.stats;
  const catalog = plansData?.data;
  const billing = billingRes?.data;

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.subscription?.memberId.toLowerCase().includes(q);
      const matchesTier =
        tierFilter === 'ALL' || c.subscription?.tierCode === tierFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        c.subscription?.status === statusFilter ||
        (statusFilter === 'PAST_DUE' && c.subscription?.isOverdue);
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [customers, search, tierFilter, statusFilter]);

  async function invitePremiumClient(e: FormEvent) {
    e.preventDefault();
    setInviteSaving(true);
    setInviteError('');
    try {
      const res = await adminApi.post<
        ApiResponse<{
          firstName: string;
          lastName: string;
          email: string;
          inviteToken?: string | null;
          inviteCode?: string | null;
          inviteUrl?: string | null;
        }>
      >('/control-room/users', {
        firstName: inviteForm.firstName.trim(),
        lastName: inviteForm.lastName.trim(),
        email: inviteForm.email.trim(),
        phone: inviteForm.phone.trim() || undefined,
        role: 'USER',
        status: 'PENDING_VERIFICATION',
      });
      const code = res.data.inviteCode ?? res.data.inviteToken ?? '';
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3010';
      const path = res.data.inviteUrl ?? `/portal/register?token=${encodeURIComponent(code)}`;
      const url = path.startsWith('http') ? path : `${origin}${path}`;
      setCreatedInvite({
        name: `${res.data.firstName} ${res.data.lastName}`.trim() || res.data.email,
        code,
        url,
      });
      setInviteForm({ firstName: '', lastName: '', email: '', phone: '' });
      reload();
    } catch (err) {
      setInviteError(friendlyErrorMessage(err, 'save'));
    } finally {
      setInviteSaving(false);
    }
  }

  async function runOverdueCheck() {
    setRunningCheck(true);
    setCheckMsg('');
    try {
      const res = await adminApi.post<
        ApiResponse<{ scanned: number; markedPastDue: number; noticesSent: number }>
      >('/control-room/billing/run-overdue-check', {});
      setCheckMsg(
        `Checked ${res.data.scanned} overdue · marked ${res.data.markedPastDue} past due · ${res.data.noticesSent} notices sent`,
      );
      reload();
      reloadBilling();
    } catch (err) {
      setCheckMsg(friendlyErrorMessage(err, 'save'));
    } finally {
      setRunningCheck(false);
    }
  }

  async function saveDiscountCode(e: FormEvent) {
    e.preventDefault();
    setCodeSaving(true);
    setCodeError('');
    setCodeMsg('');
    try {
      await adminApi.post('/control-room/discount-codes', {
        code: newCode.code.trim().toUpperCase(),
        percentOff: Number(newCode.percentOff),
        appliesTo: newCode.appliesTo,
        description: newCode.description.trim() || undefined,
        isActive: true,
      });
      setNewCode({ code: '', percentOff: '10', appliesTo: 'BOTH', description: '' });
      setCodeMsg('Discount code saved.');
      reloadCodes();
    } catch (err) {
      setCodeError(friendlyErrorMessage(err, 'save'));
    } finally {
      setCodeSaving(false);
    }
  }

  const discountCodes = codesRes?.data ?? [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Customers & Subscriptions</h1>
          <p className="text-muted">
            Manage client plans, coverage, and billing status from dispatch — synced with the client portal.
          </p>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn-secondary"
            disabled={runningCheck}
            onClick={() => void runOverdueCheck()}
          >
            {runningCheck ? 'Running…' : 'Run overdue check'}
          </button>
          <Link href={CONTROL_ROOM_ROUTES.dispatch} className="btn-secondary">
            Dispatch
          </Link>
        </div>
      </div>

      {checkMsg && <div className="alert alert--success" role="status">{checkMsg}</div>}

      <section className="card">
        <h2>Invite premium / panic-app client</h2>
        <p className="text-muted">
          Owners, managers, admins, and sales create an invite code for homes,
          stores, and work sites. The customer enters the code on the portal
          before they can fill in panic-app details. Store shoppers stay on a
          separate website account.
        </p>
        {inviteError && <ErrorAlert error={inviteError} />}
        <form className="stack-form" onSubmit={invitePremiumClient}>
          <div className="form-row-2">
            <label>
              First name
              <input
                required
                value={inviteForm.firstName}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, firstName: e.target.value })
                }
              />
            </label>
            <label>
              Last name
              <input
                required
                value={inviteForm.lastName}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, lastName: e.target.value })
                }
              />
            </label>
          </div>
          <div className="form-row-2">
            <label>
              Email
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
              />
            </label>
            <label>
              Phone
              <input
                value={inviteForm.phone}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, phone: e.target.value })
                }
                placeholder="+27 …"
              />
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={inviteSaving}>
            {inviteSaving ? 'Creating…' : 'Generate invite code'}
          </button>
        </form>
      </section>

      {createdInvite && (
        <div className="modal-overlay" onClick={() => setCreatedInvite(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Invite code ready</h3>
            <p>
              Give <strong>{createdInvite.name}</strong> this code to activate
              the panic app:
            </p>
            <p
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                margin: '0.75rem 0',
              }}
            >
              {createdInvite.code}
            </p>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Link: {createdInvite.url}
            </p>
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void navigator.clipboard.writeText(createdInvite.code);
                }}
              >
                Copy code
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCreatedInvite(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="card">
        <h2>Discount codes</h2>
        <p className="text-muted">
          Promo codes stack on top of loyalty/CRM discounts (capped at 30%). Demo: NEXUS10 (both), GEAR15 (store).
        </p>
        {codeError && <ErrorAlert error={codeError} />}
        {codeMsg && <div className="alert alert--success">{codeMsg}</div>}
        <form className="stack-form" onSubmit={saveDiscountCode} style={{ marginBottom: '1rem' }}>
          <div className="form-row-2">
            <label>
              Code
              <input
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                placeholder="NEXUS10"
                required
              />
            </label>
            <label>
              Percent off
              <input
                type="number"
                min={1}
                max={30}
                value={newCode.percentOff}
                onChange={(e) => setNewCode({ ...newCode, percentOff: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="form-row-2">
            <label>
              Applies to
              <select
                value={newCode.appliesTo}
                onChange={(e) => setNewCode({ ...newCode, appliesTo: e.target.value })}
              >
                <option value="BOTH">Subscription &amp; store</option>
                <option value="SUBSCRIPTION">Subscription only</option>
                <option value="STORE">Store only</option>
              </select>
            </label>
            <label>
              Description
              <input
                value={newCode.description}
                onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                placeholder="Optional note"
              />
            </label>
          </div>
          <button type="submit" className="btn-secondary" disabled={codeSaving}>
            {codeSaving ? 'Saving…' : 'Create / update code'}
          </button>
        </form>
        {discountCodes.length > 0 && (
          <ul className="status-list">
            {discountCodes.map((c) => (
              <li key={c.id} className="status-list-item">
                <span className="status-list-link">
                  <strong>{c.code}</strong> · {c.percentOff}% · {c.appliesTo}
                  {!c.isActive ? ' · inactive' : ''}
                </span>
                <span className="text-muted">
                  used {c.usedCount}
                  {c.maxUses != null ? `/${c.maxUses}` : ''}
                  {c.description ? ` · ${c.description}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(stats || billing) && (
        <div className="stats-grid customers-stats">
          <div className="stat-card">
            <div className="stat-label">Total customers</div>
            <div className="stat-value">{stats?.total ?? billing?.totalSubscriptions ?? 0}</div>
          </div>
          <div className="stat-card stat-card--highlight">
            <div className="stat-label">Premium</div>
            <div className="stat-value">{stats?.premium ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active plans</div>
            <div className="stat-value">{stats?.active ?? billing?.active ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Past due</div>
            <div className="stat-value">{billing?.pastDueCount ?? stats?.pastDue ?? 0}</div>
          </div>
          {billing && (
            <div className="stat-card">
              <div className="stat-label">Revenue at risk</div>
              <div className="stat-value">{billing.revenueAtRiskFormatted}</div>
            </div>
          )}
          {billing && (
            <div className="stat-card">
              <div className="stat-label">MRR (active/trial)</div>
              <div className="stat-value">{billing.mrrFormatted}</div>
            </div>
          )}
        </div>
      )}

      <section className="card customers-toolbar">
        <input
          type="search"
          placeholder="Search name, email, or member ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
          <option value="ALL">All tiers</option>
          <option value="ESSENTIAL">Essential</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIALING">Trialing</option>
          <option value="PAST_DUE">Past due</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          type="button"
          className="btn-secondary"
          disabled={filtered.length === 0}
          onClick={() =>
            exportCsv(
              'customers.csv',
              filtered.map((c) => ({
                name: `${c.firstName} ${c.lastName}`,
                email: c.email,
                memberId: c.subscription?.memberId ?? '',
                plan: c.subscription?.planName ?? '',
                status: c.subscription?.status ?? '',
                monthly: c.subscription?.priceFormatted ?? '',
                validUntil: c.subscription?.validUntil
                  ? new Date(c.subscription.validUntil).toLocaleDateString()
                  : '',
              })),
            )
          }
        >
          Export CSV
        </button>
      </section>

      {loading && <LoadingSpinner label="Loading customers..." />}
      {error && <ErrorAlert error={error} />}

      {!loading && !error && (
        <section className="card card--flush customers-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Member ID</th>
                  <th>Plan</th>
                  <th>Coverage</th>
                  <th>Status</th>
                  <th>Monthly</th>
                  <th>Valid until</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const overdue = c.subscription?.isOverdue || c.subscription?.status === 'PAST_DUE';
                  return (
                    <tr key={c.id} className={overdue ? 'row--alert' : undefined}>
                      <td>
                        <strong>{c.firstName} {c.lastName}</strong>
                        <div className="text-muted">{c.email}</div>
                        <span className="badge">
                          {c.role === 'FAMILY_MEMBER' ? 'Family member' : 'Primary subscriber'}
                        </span>
                      </td>
                      <td className="text-muted">{c.subscription?.memberId ?? '—'}</td>
                      <td><SubscriptionBadge subscription={c.subscription} /></td>
                      <td><CoverageBadges access={c.subscription?.access} /></td>
                      <td>
                        <span className={`status-pill status-pill--${(c.subscription?.status ?? 'active').toLowerCase()}`}>
                          {c.subscription?.status.replace('_', ' ') ?? '—'}
                        </span>
                        {overdue && (
                          <span className="badge badge--danger" style={{ marginLeft: 6 }}>
                            Overdue{c.subscription?.daysPastDue ? ` ${c.subscription.daysPastDue}d` : ''}
                          </span>
                        )}
                      </td>
                      <td>{c.subscription?.priceFormatted ?? '—'}</td>
                      <td className="text-muted">
                        {c.subscription?.validUntil
                          ? new Date(c.subscription.validUntil).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <button type="button" className="btn-sm" onClick={() => setSelectedId(c.id)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="empty-state empty-state--inline">No customers match your filters.</div>
          )}
        </section>
      )}

      {selectedId && catalog && (
        <CustomerSubscriptionModal
          userId={selectedId}
          catalog={catalog}
          saving={saving}
          error={formError}
          onClose={() => {
            setSelectedId(null);
            setFormError('');
          }}
          onSave={async (payload) => {
            setSaving(true);
            setFormError('');
            try {
              await adminApi.patch(`/control-room/customers/${selectedId}/subscription`, payload);
              setSelectedId(null);
              reload();
              reloadBilling();
            } catch (err) {
              setFormError(friendlyErrorMessage(err, 'save'));
            } finally {
              setSaving(false);
            }
          }}
          onCharged={() => {
            reload();
            reloadBilling();
          }}
        />
      )}
    </div>
  );
}

function CustomerSubscriptionModal({
  userId,
  catalog,
  saving,
  error,
  onClose,
  onSave,
  onCharged,
}: {
  userId: string;
  catalog: PlansCatalog;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onCharged: () => void;
}) {
  const { data, loading, reload } = useApi(
    () => adminApi.get<ApiResponse<CustomerDetail>>(`/control-room/customers/${userId}/subscription`),
    [userId],
  );

  const [tierCode, setTierCode] = useState('ESSENTIAL');
  const [addons, setAddons] = useState<string[]>([]);
  const [status, setStatus] = useState('ACTIVE');
  const [validUntil, setValidUntil] = useState('');
  const [memberId, setMemberId] = useState('');
  const [note, setNote] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [charging, setCharging] = useState(false);
  const [chargeMsg, setChargeMsg] = useState('');
  const [chargeError, setChargeError] = useState('');
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);
  const [manualDiscount, setManualDiscount] = useState('0');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [loyaltyNotes, setLoyaltyNotes] = useState('');
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [loyaltyMsg, setLoyaltyMsg] = useState('');
  const [loyaltyError, setLoyaltyError] = useState('');

  const detail = data?.data;

  useEffect(() => {
    if (!detail) return;
    const sub = detail.subscription;
    setTierCode(sub.tierCode);
    setAddons(sub.addons);
    setStatus(sub.status);
    setValidUntil(sub.validUntil.slice(0, 10));
    setMemberId(sub.memberId);
    setNote('');
    setNewPassword('');
    setPasswordMsg('');
    setPasswordError('');
    setChargeMsg('');
    setChargeError('');
    setLoyaltyMsg('');
    setLoyaltyError('');
  }, [detail]);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .get<ApiResponse<LoyaltySummary>>(`/control-room/customers/${userId}/loyalty`)
      .then((res) => {
        if (cancelled) return;
        setLoyalty(res.data);
        setManualDiscount(String(res.data.manualDiscountPercent));
        setLoyaltyNotes(res.data.notes ?? '');
        setAdjustPoints('');
      })
      .catch(() => {
        if (!cancelled) setLoyalty(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, detail]);

  async function resetPassword() {
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordMsg('');
    try {
      await adminApi.patch(`/control-room/users/${userId}`, { password: newPassword });
      setNewPassword('');
      setPasswordMsg('Password updated. Share the new credentials with the client securely.');
    } catch (err) {
      setPasswordError(friendlyErrorMessage(err, 'save'));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function chargeMonthly() {
    setCharging(true);
    setChargeError('');
    setChargeMsg('');
    try {
      const res = await adminApi.post<
        ApiResponse<{ reference: string; amountFormatted: string; checkoutUrl: string }>
      >(`/control-room/customers/${userId}/charge-monthly`, {});
      setChargeMsg(
        `Monthly charge created: ${res.data.reference} (${res.data.amountFormatted}). Client can complete at portal checkout.`,
      );
      reload();
      onCharged();
    } catch (err) {
      setChargeError(friendlyErrorMessage(err, 'save'));
    } finally {
      setCharging(false);
    }
  }

  async function saveLoyalty() {
    setLoyaltySaving(true);
    setLoyaltyError('');
    setLoyaltyMsg('');
    try {
      const res = await adminApi.patch<ApiResponse<LoyaltySummary>>(
        `/control-room/customers/${userId}/loyalty`,
        {
          manualDiscountPercent: Number(manualDiscount),
          notes: loyaltyNotes.trim() || null,
          adjustPoints: adjustPoints.trim() ? Number(adjustPoints) : undefined,
        },
      );
      setLoyalty(res.data);
      setManualDiscount(String(res.data.manualDiscountPercent));
      setLoyaltyNotes(res.data.notes ?? '');
      setAdjustPoints('');
      setLoyaltyMsg(
        `Loyalty updated — ${res.data.tierName}, ${res.data.points} pts, ${res.data.effectiveDiscountPercent}% effective.`,
      );
    } catch (err) {
      setLoyaltyError(friendlyErrorMessage(err, 'save'));
    } finally {
      setLoyaltySaving(false);
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
          <LoadingSpinner label="Loading subscription..." />
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const customer = detail.customer;
  const sub = detail.subscription;
  const isPremium = tierCode === 'PREMIUM';
  const roleLabel =
    customer.roleLabel ??
    (customer.role === 'FAMILY_MEMBER' ? 'Family member' : 'Primary subscriber');

  function toggleAddon(code: string) {
    if (isPremium) return;
    setAddons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      tierCode,
      addons: isPremium ? undefined : addons,
      status,
      validUntil,
      memberId,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide customer-sub-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Manage subscription — {customer.firstName} {customer.lastName}</h3>
        <p className="text-muted">
          {customer.email} · {roleLabel}
          {sub.isOverdue ? ` · Overdue ${sub.daysPastDue ?? 0}d` : ''}
        </p>

        {error && <ErrorAlert error={error} />}

        <div className="customer-sub-modal__links">
          <Link href={mapHref('users')} className="link-sm">View on map</Link>
          <Link href={dispatchHref()} className="link-sm">Dispatch</Link>
        </div>

        <div className="customer-billing-summary">
          <h4>Coverage &amp; billing</h4>
          <CoverageBadges access={sub.access} />
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Billing: {sub.status.replace('_', ' ')}
            {sub.amountDueFormatted ? ` · Due ${sub.amountDueFormatted}` : ''}
            {sub.nextBillingAt
              ? ` · Next ${new Date(sub.nextBillingAt).toLocaleDateString()}`
              : ''}
            {sub.billingFailedCount ? ` · Failed attempts ${sub.billingFailedCount}` : ''}
          </p>
          {chargeError && <ErrorAlert error={chargeError} />}
          {chargeMsg && <div className="alert alert--success">{chargeMsg}</div>}
          <button
            type="button"
            className="btn-secondary"
            disabled={charging}
            onClick={() => void chargeMonthly()}
          >
            {charging ? 'Creating charge…' : 'Charge monthly'}
          </button>
        </div>

        {loyalty && (
          <div className="customer-billing-summary">
            <h4>Loyalty &amp; discounts</h4>
            <p className="text-muted">
              {loyalty.tierName} · {loyalty.points.toLocaleString()} pts · effective{' '}
              {loyalty.effectiveDiscountPercent}% off
              {loyalty.nextTierName
                ? ` · ${loyalty.pointsToNext} pts to ${loyalty.nextTierName}`
                : ''}
              {loyalty.activePromoCode ? ` · promo ${loyalty.activePromoCode}` : ''}
            </p>
            {loyaltyError && <ErrorAlert error={loyaltyError} />}
            {loyaltyMsg && <div className="alert alert--success">{loyaltyMsg}</div>}
            <div className="form-row-2">
              <label>
                Manual discount % (0–30)
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={manualDiscount}
                  onChange={(e) => setManualDiscount(e.target.value)}
                />
              </label>
              <label>
                Adjust points (+/−)
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="e.g. 100 or -50"
                />
              </label>
            </div>
            <label>
              CRM notes
              <textarea
                rows={2}
                value={loyaltyNotes}
                onChange={(e) => setLoyaltyNotes(e.target.value)}
                placeholder="VIP courtesy rate, goodwill credit…"
              />
            </label>
            <button
              type="button"
              className="btn-secondary"
              disabled={loyaltySaving}
              onClick={() => void saveLoyalty()}
            >
              {loyaltySaving ? 'Saving…' : 'Save loyalty'}
            </button>
          </div>
        )}

        {customer.status === 'PENDING_VERIFICATION' && (
          <div className="customer-password-reset">
            <h4>Panic-app invite</h4>
            <p className="text-muted">
              This premium client has not finished registration yet. Generate a
              fresh invite code to share with them.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void (async () => {
                  try {
                    const res = await adminApi.post<
                      ApiResponse<{ inviteCode?: string; inviteToken?: string; inviteUrl?: string }>
                    >(`/control-room/customers/${userId}/invite`, {});
                    const code = res.data.inviteCode ?? res.data.inviteToken ?? '';
                    window.alert(`Invite code: ${code}`);
                  } catch (err) {
                    setPasswordError(friendlyErrorMessage(err, 'save'));
                  }
                })();
              }}
            >
              Regenerate invite code
            </button>
          </div>
        )}

        <div className="customer-password-reset">
          <h4>Reset portal password</h4>
          <p className="text-muted">
            Use this when a client selects &ldquo;Forgot password?&rdquo; on the client portal login.
          </p>
          {passwordError && <ErrorAlert error={passwordError} />}
          {passwordMsg && <div className="alert alert--success">{passwordMsg}</div>}
          <div className="customer-password-reset__row">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={passwordSaving || !newPassword.trim()}
              onClick={() => void resetPassword()}
            >
              {passwordSaving ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </div>

        <form className="stack-form" onSubmit={submit}>
          <label>
            Member ID
            <input value={memberId} onChange={(e) => setMemberId(e.target.value)} required />
          </label>

          <label>
            Plan tier
            <select value={tierCode} onChange={(e) => setTierCode(e.target.value)}>
              {catalog.tiers.map((t) => (
                <option key={t.code} value={t.code}>{t.name} — {t.priceFormatted}</option>
              ))}
            </select>
          </label>

          {!isPremium && (
            <fieldset className="addon-checkboxes">
              <legend>Add-ons</legend>
              {catalog.addons.map((a) => (
                <label key={a.code} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addons.includes(a.code)}
                    onChange={() => toggleAddon(a.code)}
                  />
                  {a.name} ({a.priceFormatted})
                </label>
              ))}
            </fieldset>
          )}

          {isPremium && (
            <p className="text-muted">Premium includes all add-ons automatically.</p>
          )}

          <div className="form-row-2">
            <label>
              Billing status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="TRIALING">Trialing</option>
                <option value="PAST_DUE">Past due</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <label>
              Valid until
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
            </label>
          </div>

          <label>
            Note to customer (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Upgraded after phone call — invoice sent separately"
              rows={2}
            />
          </label>

          {detail.payments.length > 0 && (
            <div className="customer-payments">
              <h4>Recent payments</h4>
              <ul>
                {detail.payments.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <span>{p.kind === 'MONTHLY' ? 'Monthly' : 'Checkout'} · {p.reference}</span>
                    <span>{p.amountFormatted}</span>
                    <span className="badge">{p.status}</span>
                    <span className="text-muted">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="btn-row">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save subscription'}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
