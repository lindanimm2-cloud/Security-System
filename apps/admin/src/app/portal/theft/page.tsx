'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PortalShell } from '@/components/PortalShell';
import { clientApi } from '@/lib/api-client';

export default function TheftPage() {
  return (
    <AuthGuard portal="client" loginPath="/portal/login">
      {(session) => (
        <PortalShell session={session}>
          <TheftContent />
        </PortalShell>
      )}
    </AuthGuard>
  );
}

function TheftContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    description: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehiclePlate: '',
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await clientApi.post('/client/theft', form);
      router.push('/portal/incidents');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header"><h1>Report Theft</h1></div>
      <form className="form-card" onSubmit={handleSubmit}>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></label>
        <label>Vehicle Make<input value={form.vehicleMake} onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })} /></label>
        <label>Vehicle Model<input value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} /></label>
        <label>Color<input value={form.vehicleColor} onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })} /></label>
        <label>License Plate<input value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} /></label>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <LoadingSpinner label="" size="sm" /> : 'Submit Theft Report'}
        </button>
      </form>
    </div>
  );
}
