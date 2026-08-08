'use client';

import { FormEvent, useState } from 'react';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

export type LoyaltySummary = {
  tier: string;
  tierName: string;
  points: number;
  tierDiscountPercent: number;
  manualDiscountPercent: number;
  effectiveDiscountPercent: number;
  activePromoCode: string | null;
  promoDiscountPercent?: number;
  benefits: string;
  nextTierName: string | null;
  pointsToNext: number;
  progressPercent: number;
};

type Props = {
  loyalty: LoyaltySummary;
  onUpdated?: (loyalty: LoyaltySummary) => void;
  variant?: 'portal' | 'site';
  className?: string;
  showPromo?: boolean;
};

export function LoyaltySummaryCard({
  loyalty,
  onUpdated,
  variant = 'portal',
  className = '',
  showPromo = true,
}: Props) {
  const [promoCode, setPromoCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function applyPromo(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const res = await clientApi.post<ApiResponse<LoyaltySummary> & { message?: string }>(
        '/client/loyalty/promo',
        { code: promoCode },
      );
      setPromoCode('');
      setMsg(res.message ?? `Promo applied — ${res.data.effectiveDiscountPercent}% off.`);
      onUpdated?.(res.data);
    } catch (error) {
      setErr(friendlyErrorMessage(error, 'save'));
    } finally {
      setBusy(false);
    }
  }

  async function clearPromo() {
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const res = await clientApi.delete<ApiResponse<LoyaltySummary> & { message?: string }>(
        '/client/loyalty/promo',
      );
      setMsg(res.message ?? 'Promo cleared.');
      onUpdated?.(res.data);
    } catch (error) {
      setErr(friendlyErrorMessage(error, 'save'));
    } finally {
      setBusy(false);
    }
  }

  const shell =
    variant === 'site'
      ? `nx-account-card ${className}`.trim()
      : `portal-card ${className}`.trim();

  return (
    <div className={shell}>
      <div className="card-header-row">
        <h2>Loyalty rewards</h2>
        <span className={`status-pill status-pill--${loyalty.tier.toLowerCase()}`}>
          {loyalty.tierName}
        </span>
      </div>
      <p className={variant === 'site' ? 'nx-muted' : 'text-muted'}>{loyalty.benefits}</p>
      <ul className="status-list">
        <li className="status-list-item">
          <span className="status-list-link">Points</span>
          <strong>{loyalty.points.toLocaleString()}</strong>
        </li>
        <li className="status-list-item">
          <span className="status-list-link">Your discount</span>
          <strong>{loyalty.effectiveDiscountPercent}% off</strong>
        </li>
        {loyalty.nextTierName && (
          <li className="status-list-item">
            <span className="status-list-link">Next tier</span>
            <strong>
              {loyalty.nextTierName} · {loyalty.pointsToNext} pts to go
            </strong>
          </li>
        )}
        {loyalty.activePromoCode && (
          <li className="status-list-item">
            <span className="status-list-link">Promo</span>
            <strong>
              {loyalty.activePromoCode}
              {loyalty.promoDiscountPercent ? ` (+${loyalty.promoDiscountPercent}%)` : ''}
            </strong>
          </li>
        )}
      </ul>
      {loyalty.nextTierName && (
        <div
          className="loyalty-progress"
          role="progressbar"
          aria-valuenow={loyalty.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            marginTop: '0.75rem',
            height: 6,
            borderRadius: 999,
            background: 'rgba(128,128,128,0.2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${loyalty.progressPercent}%`,
              height: '100%',
              background: 'var(--accent, #c45c26)',
            }}
          />
        </div>
      )}

      {showPromo && (
        <form
          onSubmit={applyPromo}
          style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Promo code (e.g. NEXUS10)"
            aria-label="Promo code"
            style={{ flex: '1 1 10rem' }}
          />
          <button type="submit" className={variant === 'site' ? 'nx-btn nx-btn--outline' : 'btn-secondary'} disabled={busy || !promoCode.trim()}>
            {busy ? '…' : 'Apply'}
          </button>
          {loyalty.activePromoCode && (
            <button
              type="button"
              className={variant === 'site' ? 'nx-btn nx-btn--ghost' : 'btn-ghost'}
              disabled={busy}
              onClick={() => void clearPromo()}
            >
              Clear promo
            </button>
          )}
        </form>
      )}
      {msg && (
        <p className={variant === 'site' ? 'nx-success' : 'text-muted'} style={{ marginTop: '0.5rem' }}>
          {msg}
        </p>
      )}
      {err && (
        <p role="alert" style={{ marginTop: '0.5rem', color: 'var(--danger, #b42318)' }}>
          {err}
        </p>
      )}
    </div>
  );
}
