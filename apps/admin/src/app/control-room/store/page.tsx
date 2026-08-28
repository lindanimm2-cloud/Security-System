'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { exportCsv } from '@/lib/export-csv';
import { openBrandedTableReport } from '@/lib/branded-document';
import { UiSelect } from '@/components/ui/UiSelect';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch } from '@/components/ui/ListSearch';
import { PageTabs } from '@/components/ui/PageTabs';
import { InsightList } from '@/components/ui/InsightList';
import { ChartCard } from '@/components/ui/charts/ChartCard';
import { DonutChart } from '@/components/ui/charts/DonutChart';
import { HorizontalBars } from '@/components/ui/charts/HorizontalBars';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { matchesSearch } from '@/lib/list-search';

type Overview = {
  stats: {
    catalogSize: number;
    lowStock: number;
    openOrders: number;
    revenueFormatted: string;
    openLeads: number;
    technicians: number;
    activeInstalls: number;
  };
  lowStock: { id: string; name: string; sku: string; stock: number; category: string }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    totalFormatted: string;
    createdAt: string;
    itemCount: number;
  }[];
};

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  priceFormatted: string;
  stock: number;
  imageEmoji: string;
  featured: boolean;
  isActive: boolean;
  requiresLicense: boolean;
};

const CATEGORIES = [
  'FIREARMS',
  'BODY_ARMOUR',
  'PERSONAL_SECURITY',
  'CCTV',
  'NVR_STORAGE',
  'SMART_HOME',
  'ALARMS',
  'SENSORS',
  'ELECTRIC_FENCING',
  'PERIMETER',
  'ACCESS_CONTROL',
  'GATES',
  'INTERCOMS',
  'GUARD_EQUIPMENT',
  'GUARD_TOUR',
  'VEHICLE_SECURITY',
  'LIGHTING',
  'NETWORKING',
  'POWER',
  'INSTALL_MATERIALS',
  'TOOLS',
  'TECH_EQUIPMENT',
  'SAFES',
  'LOCKS',
  'PHYSICAL_PERIMETER',
  'FIRE_SAFETY',
  'PACKAGES',
  'CONTROL_ROOM',
  'SIGNS',
  'INSPECTION',
  'CYBER',
  'SPARE_PARTS',
];

const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export default function StoreCrmPage() {
  return (
    <ControlRoomLayout title="Gear Store CRM">
      <StoreCrmContent />
    </ControlRoomLayout>
  );
}

function StoreCrmContent() {
  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverview,
  } = useApi(() => adminApi.get<ApiResponse<Overview>>('/store/admin/overview'), []);

  const {
    data: productsRes,
    loading: productsLoading,
    error: productsError,
    reload: reloadProducts,
  } = useApi(
    () => adminApi.get<{ success: boolean; data: Product[] }>('/store/admin/products'),
    [],
  );

  const {
    data: ordersRes,
    reload: reloadOrders,
  } = useApi(
    () =>
      adminApi.get<{
        success: boolean;
        data: Overview['recentOrders'] &
          {
            id: string;
            orderNumber: string;
            customerName: string;
            status: string;
            totalFormatted: string;
          }[];
        stats: { revenueFormatted: string; pending: number; total: number };
      }>('/store/admin/orders'),
    [],
  );

  const [tab, setTab] = useState<'overview' | 'products' | 'orders'>('overview');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    id: '',
    sku: '',
    name: '',
    description: '',
    category: 'GEAR',
    priceCents: 10000,
    stock: 10,
    imageEmoji: '🛡️',
    featured: false,
    isActive: true,
    requiresLicense: false,
  });

  const products = productsRes?.data ?? [];
  const orders = ordersRes?.data ?? [];
  const filteredProducts = useMemo(
    () =>
      products.filter((p) => matchesSearch(search, p.name, p.sku, p.category, p.description)),
    [products, search],
  );
  const filteredOrders = useMemo(
    () =>
      orders.filter((o) =>
        matchesSearch(search, o.orderNumber, o.customerName, o.status, o.id),
      ),
    [orders, search],
  );

  function editProduct(p: Product) {
    setForm({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      category: p.category,
      priceCents: p.priceCents,
      stock: p.stock,
      imageEmoji: p.imageEmoji,
      featured: p.featured,
      isActive: p.isActive,
      requiresLicense: p.requiresLicense,
    });
    setTab('products');
    setFormOpen(true);
  }

  function openCreateForm() {
    resetForm();
    setTab('products');
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
      sku: '',
      name: '',
      description: '',
      category: 'GEAR',
      priceCents: 10000,
      stock: 10,
      imageEmoji: '🛡️',
      featured: false,
      isActive: true,
      requiresLicense: false,
    });
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await adminApi.post('/store/admin/products', {
        ...(form.id ? { id: form.id } : {}),
        sku: form.sku,
        name: form.name,
        description: form.description,
        category: form.category,
        priceCents: Number(form.priceCents),
        stock: Number(form.stock),
        imageEmoji: form.imageEmoji,
        featured: form.featured,
        isActive: form.isActive,
        requiresLicense: form.requiresLicense,
      });
      closeFormDialog();
      reloadProducts();
      reloadOverview();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateOrderStatus(id: string, status: string) {
    await adminApi.patch(`/store/admin/orders/${id}/status`, { status });
    reloadOrders();
    reloadOverview();
  }

  const stats = overview?.data?.stats;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="text-muted">
            Owner CRM for catalog, stock, and gear orders — linked to sales and install teams.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/store" className="btn-secondary" target="_blank">
            Open storefront
          </Link>
          <Link href="/control-room/sales" className="btn-secondary">
            Sales desk
          </Link>
        </div>
      </div>

      <PageTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'products', label: 'Catalog' },
          { id: 'orders', label: 'Orders' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {(tab === 'products' || tab === 'orders') && (
        <div className="list-search-bar">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder={tab === 'products' ? 'Search name, SKU, category…' : 'Search order, customer…'}
            resultCount={tab === 'products' ? filteredProducts.length : filteredOrders.length}
            totalCount={tab === 'products' ? products.length : orders.length}
            id="store-list-search"
          />
        </div>
      )}

      {tab === 'overview' && (
        <>
          {overviewLoading && <LoadingSpinner label="Loading store..." />}
          {overviewError && (
            <ErrorAlert message={overviewError} onRetry={reloadOverview} />
          )}
          {stats && overview?.data && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Active SKUs</span>
                  <strong className="stat-value">{stats.catalogSize}</strong>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Revenue (recent)</span>
                  <strong className="stat-value">{stats.revenueFormatted}</strong>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Open orders</span>
                  <strong className="stat-value">{stats.openOrders}</strong>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Low stock</span>
                  <strong className="stat-value">{stats.lowStock}</strong>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Open leads</span>
                  <strong className="stat-value">{stats.openLeads}</strong>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Technicians</span>
                  <strong className="stat-value">{stats.technicians}</strong>
                </div>
              </div>

              <div className="ds-overview-grid">
                <ChartCard
                  className="ds-overview-grid__span-7"
                  title="Inventory health"
                  subtitle="Low-stock units by category"
                >
                  {overview.data.lowStock.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0 }}>
                      All monitored SKUs are above reorder thresholds.
                    </p>
                  ) : (
                    <HorizontalBars
                      compact
                      items={Object.entries(
                        overview.data.lowStock.reduce<Record<string, number>>((acc, item) => {
                          const key = item.category.replace(/_/g, ' ');
                          acc[key] = (acc[key] ?? 0) + 1;
                          return acc;
                        }, {}),
                      ).map(([label, value]) => ({
                        label,
                        value,
                        tone: value >= 2 ? ('danger' as const) : ('warning' as const),
                      }))}
                    />
                  )}
                </ChartCard>

                <div className="card-panel ds-overview-grid__span-5">
                  <h2>Low stock alerts</h2>
                  <InsightList
                    emptyTitle="Stock levels look healthy"
                    emptyBody="No SKUs are below the reorder threshold."
                    items={overview.data.lowStock.map((p) => ({
                      id: p.id,
                      title: p.name,
                      detail: p.sku,
                      meta: `${p.stock} left`,
                      tone: p.stock <= 2 ? 'danger' : 'warning',
                    }))}
                  />
                </div>

                <ChartCard
                  className="ds-overview-grid__span-5"
                  title="Order mix"
                  subtitle="Recent store orders by status"
                >
                  <DonutChart
                    centerLabel="Orders"
                    centerValue={overview.data.recentOrders.length}
                    slices={Object.entries(
                      overview.data.recentOrders.reduce<Record<string, number>>((acc, order) => {
                        acc[order.status] = (acc[order.status] ?? 0) + 1;
                        return acc;
                      }, {}),
                    ).map(([label, value], index) => ({
                      label,
                      value,
                      tone: (['accent', 'success', 'warning', 'neutral', 'danger'] as const)[index % 5],
                    }))}
                  />
                </ChartCard>

                <div className="card-panel ds-overview-grid__span-7">
                  <h2>Recent orders</h2>
                  {overview.data.recentOrders.length === 0 ? (
                    <EmptyState title="No recent orders" body="Store orders will appear here." />
                  ) : (
                    <div className="table-wrap">
                      <table className="ds-mini-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.data.recentOrders.slice(0, 6).map((order) => (
                            <tr key={order.id}>
                              <td>{order.orderNumber}</td>
                              <td>{order.customerName}</td>
                              <td>{order.totalFormatted}</td>
                              <td>{order.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'products' && (
        <div className="card-panel page-section">
            <div className="card-header-row card-header-row--panel">
              <h2>Catalog ({filteredProducts.length})</h2>
              <button type="button" className="btn-primary btn-sm" onClick={openCreateForm}>
                + Add product
              </button>
            </div>
            {productsLoading && <LoadingSpinner label="Loading products..." />}
            {productsError && (
              <ErrorAlert message={productsError} onRetry={reloadProducts} />
            )}
            {filteredProducts.length === 0 && !productsLoading ? (
              <EmptyState
                title={search.trim() ? 'No matches' : 'No products'}
                body={search.trim() ? 'Try another name, SKU, or category.' : 'Add a product to the catalog.'}
              />
            ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.imageEmoji} {p.name}
                        {!p.isActive && (
                          <span className="badge" style={{ marginLeft: 6 }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>{p.category}</td>
                      <td>{p.priceFormatted}</td>
                      <td>{p.stock}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => editProduct(p)}
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
        </div>
      )}

      {tab === 'orders' && (
        <div className="card-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>Store orders</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={filteredOrders.length === 0}
                onClick={() =>
                  openBrandedTableReport({
                    title: 'Store orders register',
                    filenameStem: 'store-orders',
                    headers: ['Order', 'Customer', 'Total', 'Status', 'Created'],
                    rows: filteredOrders.map((o) => [
                      o.orderNumber,
                      o.customerName,
                      o.totalFormatted,
                      o.status,
                      o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
                    ]),
                  })
                }
              >
                Print report
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={filteredOrders.length === 0}
                onClick={() =>
                  exportCsv(
                    'store-orders.csv',
                    filteredOrders.map((o) => ({
                      orderNumber: o.orderNumber,
                      customer: o.customerName,
                      total: o.totalFormatted,
                      status: o.status,
                      createdAt: o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
                    })),
                    { title: 'Store orders register' },
                  )
                }
              >
                Export CSV
              </button>
            </div>
          </div>
          {filteredOrders.length === 0 ? (
            <EmptyState
              title={search.trim() ? 'No matches' : 'No orders'}
              body={search.trim() ? 'Try another order number or customer.' : 'Store orders will appear here.'}
            />
          ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNumber}</td>
                    <td>{o.customerName}</td>
                    <td>{o.totalFormatted}</td>
                    <td>
                      <UiSelect
                        ariaLabel={`Order ${o.orderNumber} status`}
                        value={o.status}
                        onChange={(status) => updateOrderStatus(o.id, status)}
                        options={ORDER_STATUSES.map((s) => ({ value: s, label: s }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {formOpen && (
        <OpsDialog
          title={form.id ? 'Edit product' : 'Add product'}
          subtitle="Catalog item for the gear store and install quotes."
          onClose={closeFormDialog}
          wide
        >
          {formError && <ErrorAlert message={formError} />}
          <form className="stack-form" onSubmit={saveProduct}>
            <label>
              SKU
              <input
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </label>
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label>
              Category
              <UiSelect
                compact={false}
                ariaLabel="Product category"
                value={form.category}
                onChange={(category) => setForm({ ...form, category })}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </label>
            <label>
              Price (cents)
              <input
                type="number"
                min={0}
                required
                value={form.priceCents}
                onChange={(e) =>
                  setForm({ ...form, priceCents: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Stock
              <input
                type="number"
                min={0}
                required
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Emoji icon
              <input
                value={form.imageEmoji}
                onChange={(e) =>
                  setForm({ ...form, imageEmoji: e.target.value })
                }
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
              />
              Featured
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.requiresLicense}
                onChange={(e) =>
                  setForm({ ...form, requiresLicense: e.target.checked })
                }
              />
              Requires licence
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Active
            </label>
            <div className="fleet-form__actions">
              <button type="button" className="btn-ghost" onClick={closeFormDialog}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : form.id ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </OpsDialog>
      )}
    </div>
  );
}
