'use client';

import { useState, type FormEvent } from 'react';
import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';

type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  stock: number;
  imageEmoji: string;
  lowStock: boolean;
  priceFormatted: string;
};

type StockRequest = {
  id: string;
  quantity: number;
  status: string;
  notes: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string; imageEmoji: string; category: string };
};

export default function TechInventoryPage() {
  return (
    <TechLayout title="Inventory & requests">
      <TechInventoryContent />
    </TechLayout>
  );
}

function TechInventoryContent() {
  const { data: invData, loading: invLoading, error: invError, reload: reloadInv } = useApi(
    () => techApi.get<ApiResponse<InventoryItem[]>>('/store/tech/inventory'),
    [],
  );
  const { data: reqData, loading: reqLoading, error: reqError, reload: reloadReq } = useApi(
    () => techApi.get<ApiResponse<StockRequest[]>>('/store/tech/stock-requests'),
    [],
  );

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [actionError, setActionError] = useState('');

  async function submitRequest(e: FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setBusy(true);
    setActionError('');
    setMsg('');
    try {
      await techApi.post('/store/tech/stock-requests', {
        productId,
        quantity: Number(quantity) || 1,
        notes: notes.trim() || undefined,
      });
      setMsg('Parts request submitted to store / control room.');
      setNotes('');
      setQuantity('1');
      reloadReq();
      reloadInv();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  if (invLoading || reqLoading) return <LoadingSpinner label="Loading inventory..." />;
  if (invError || !invData) return <ErrorAlert message={invError ?? 'Failed to load'} onRetry={reloadInv} />;

  const inventory = invData.data;
  const requests = reqData?.data ?? [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Parts inventory</h1>
          <p className="text-muted">
            Browse CCTV / gear stock and request parts for installs. Control room fulfills requests.
          </p>
        </div>
      </div>

      {msg && <div className="alert alert--success">{msg}</div>}
      {actionError && <ErrorAlert message={actionError} />}
      {reqError && <ErrorAlert message={reqError} onRetry={reloadReq} />}

      <form className="portal-card commission-form stack-form" onSubmit={submitRequest}>
        <h2 style={{ margin: 0 }}>Request parts</h2>
        <div className="commission-form__grid">
          <div className="form-field form-field--full">
            <span>Product</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">Select partâ€¦</option>
              {inventory.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.imageEmoji} {p.name} ({p.stock} in stock)
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <span>Notes (job / site)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="For Umhlanga CCTV install"
            />
          </div>
        </div>
        <div className="commission-form__actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Submittingâ€¦' : 'Submit request'}
          </button>
        </div>
      </form>

      <section className="portal-card" style={{ marginTop: '1.25rem' }}>
        <h2>My requests</h2>
        {requests.length === 0 ? (
          <p className="text-muted">No stock requests yet.</p>
        ) : (
          <ul className="status-list">
            {requests.map((r) => (
              <li key={r.id} className="status-list-item">
                <div>
                  <strong>
                    {r.product.imageEmoji} {r.product.name}
                  </strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    Qty {r.quantity}
                    {r.notes ? ` Â· ${r.notes}` : ''}
                    {' Â· '}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`status-pill status-pill--${r.status.toLowerCase()}`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="portal-card" style={{ marginTop: '1.25rem' }}>
        <h2>Available stock</h2>
        <div className="tech-profile-grid">
          {inventory.map((p) => (
            <article key={p.id} className="tech-profile-card">
              <div className="card-header-row">
                <h3 style={{ margin: 0, fontSize: '1rem' }}>
                  {p.imageEmoji} {p.name}
                </h3>
                <span className={`status-pill ${p.lowStock ? 'status-pill--alert' : 'status-pill--ok'}`}>
                  {p.stock} left
                </span>
              </div>
              <p className="text-muted" style={{ margin: '0.35rem 0' }}>
                {p.category} Â· {p.sku}
              </p>
              <p style={{ fontSize: '0.9rem' }}>{p.description}</p>
              <button
                type="button"
                className="btn-secondary btn-sm"
                style={{ marginTop: '0.65rem' }}
                onClick={() => setProductId(p.id)}
              >
                Request this
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
