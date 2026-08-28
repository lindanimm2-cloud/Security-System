'use client';

import { useState, type FormEvent } from 'react';
import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';
import { UiSelect } from '@/components/ui/UiSelect';
import { ListSearch } from '@/components/ui/ListSearch';
import { matchesSearch } from '@/lib/list-search';
import { EmptyState } from '@/components/ui/EmptyState';
import { OpsDialog } from '@/components/ops/OpsDialog';

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
  const [search, setSearch] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);

  function openRequestForm(productId = '') {
    setProductId(productId);
    setQuantity('1');
    setNotes('');
    setActionError('');
    setRequestOpen(true);
  }

  function closeRequestForm() {
    setRequestOpen(false);
    setActionError('');
  }

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
      closeRequestForm();
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
  const filteredInventory = inventory.filter((p) =>
    matchesSearch(search, p.name, p.sku, p.category, p.description),
  );
  const filteredRequests = requests.filter((r) =>
    matchesSearch(
      search,
      r.product.name,
      r.product.sku,
      r.product.category,
      r.status,
      r.notes,
    ),
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Parts inventory</h1>
          <p className="text-muted">
            Browse CCTV / gear stock and request parts for installs. Control room fulfills requests.
          </p>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={() => openRequestForm()}>
          + Request parts
        </button>
      </div>

      {msg && <div className="alert alert--success">{msg}</div>}
      {actionError && <ErrorAlert message={actionError} />}
      {reqError && <ErrorAlert message={reqError} onRetry={reloadReq} />}

      <div className="list-search-bar">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Search parts, SKU, category…"
          resultCount={filteredInventory.length}
          totalCount={inventory.length}
        />
      </div>

      {requestOpen && (
        <OpsDialog
          title="Request parts"
          subtitle="Submit a stock request for an install job — control room fulfills it."
          onClose={closeRequestForm}
        >
          {actionError && <ErrorAlert message={actionError} />}
          <form className="stack-form" onSubmit={submitRequest}>
            <label>
              Product
              <UiSelect
                compact={false}
                ariaLabel="Product"
                value={productId}
                onChange={setProductId}
                options={[
                  { value: '', label: 'Select part…' },
                  ...inventory.map((p) => ({
                    value: p.id,
                    label: `${p.imageEmoji} ${p.name}`,
                    meta: `${p.stock} in stock`,
                  })),
                ]}
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>
            <label>
              Notes (job / site)
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="For Umhlanga CCTV install"
              />
            </label>
            <div className="fleet-form__actions">
              <button type="button" className="btn-ghost" onClick={closeRequestForm}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        </OpsDialog>
      )}

      <section className="card-panel page-section">
        <div className="card-header-row card-header-row--panel">
          <h2>My requests</h2>
        </div>
        {filteredRequests.length === 0 ? (
          <p className="text-muted">
            {search.trim() ? 'No matching requests.' : 'No stock requests yet.'}
          </p>
        ) : (
          <ul className="status-list">
            {filteredRequests.map((r) => (
              <li key={r.id} className="status-list-item">
                <div>
                  <strong>
                    {r.product.imageEmoji} {r.product.name}
                  </strong>
                  <p className="text-muted" style={{ margin: '0.15rem 0 0' }}>
                    Qty {r.quantity}
                    {r.notes ? ` · ${r.notes}` : ''}
                    {' · '}
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

      <section className="card-panel page-section">
        <div className="card-header-row card-header-row--panel">
          <h2>Available stock ({filteredInventory.length})</h2>
        </div>
        {filteredInventory.length === 0 ? (
          <EmptyState
            title={search.trim() ? 'No matches' : 'No stock'}
            body={search.trim() ? 'Try a different part name or SKU.' : 'Inventory is empty.'}
          />
        ) : (
          <div className="tech-profile-grid tech-profile-grid--inventory">
            {filteredInventory.map((p) => (
              <article key={p.id} className="tech-profile-card tech-profile-card--inventory">
                <div className="tech-profile-card__head">
                  <span className="tech-profile-card__emoji" aria-hidden>
                    {p.imageEmoji}
                  </span>
                  <div className="tech-profile-card__identity">
                    <strong>{p.name}</strong>
                    <span className="tech-profile-card__role">
                      {p.category} · {p.sku}
                    </span>
                  </div>
                  <span className={`status-pill ${p.lowStock ? 'status-pill--alert' : 'status-pill--ok'}`}>
                    {p.stock} left
                  </span>
                </div>
                <p className="tech-profile-card__note">{p.description}</p>
                <div className="tech-profile-card__footer">
                  <span className="text-muted">{p.priceFormatted}</span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => openRequestForm(p.id)}
                  >
                    Request
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
