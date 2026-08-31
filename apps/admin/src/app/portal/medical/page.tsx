'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';

type MedicalProfile = {
  bloodType: string | null;
  allergies: string | null;
  medications: string | null;
  chronicConditions: string | null;
  emergencyNotes: string | null;
  doctorContact?: string | null;
  ambulancePreference?: string | null;
  isComplete?: boolean;
};

export default function MedicalPage() {
  return (
    <PortalLayout>
      <MedicalContent />
    </PortalLayout>
  );
}

function MedicalContent() {
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<MedicalProfile>>('/client/medical'),
    [],
  );
  const [form, setForm] = useState<MedicalProfile | null>(null);

  const profile = form ?? data?.data ?? null;
  const isComplete = profile?.isComplete ?? false;
  const isSetup = !isComplete || editing;

  useEffect(() => {
    if (data?.data && !isComplete) {
      setEditing(true);
    }
  }, [data, isComplete]);

  if (loading) return <LoadingSpinner label="Loading medical profile..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (!profile) return null;

  async function save() {
    const current = form ?? data?.data;
    if (!current) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await clientApi.patch<ApiResponse<MedicalProfile>>('/client/medical', {
        bloodType: current.bloodType,
        allergies: current.allergies,
        medications: current.medications,
        chronicConditions: current.chronicConditions,
        emergencyNotes: current.emergencyNotes,
        doctorContact: current.doctorContact,
        ambulancePreference: current.ambulancePreference,
      });
      setForm(res.data);
      setSaveMsg(isComplete ? 'Medical profile updated.' : 'Medical profile saved. Responders can access this in an emergency.');
      setEditing(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof MedicalProfile, value: string) {
    setForm((prev) => {
      const base = prev ?? data?.data;
      if (!base) return prev;
      return { ...base, [field]: value };
    });
  }

  if (!isSetup) {
    return (
      <div className="page-content page-content--form">
        <div className="page-header">
          <div>
            <p className="ec-kicker">Medical profile</p>
            <h1>Medical Profile</h1>
            <p className="text-muted">Your medical details are on file and shared with responders during emergencies.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        </div>

        <div className="portal-card medical-summary">
          <dl className="medical-summary-grid">
            <MedicalSummaryItem label="Blood type" value={profile.bloodType} />
            <MedicalSummaryItem label="Allergies" value={profile.allergies} />
            <MedicalSummaryItem label="Medications" value={profile.medications} full />
            <MedicalSummaryItem label="Chronic conditions" value={profile.chronicConditions} full />
            <MedicalSummaryItem label="Emergency instructions" value={profile.emergencyNotes} full />
            <MedicalSummaryItem label="Doctor / medical contact" value={profile.doctorContact ?? null} />
            <MedicalSummaryItem label="Ambulance preference" value={profile.ambulancePreference ?? null} />
          </dl>
        </div>

        <p className="medical-emergency-hint text-muted">
          Need an ambulance now? Use the <strong>Medical Emergency</strong> button on your dashboard — it dispatches automatically.
        </p>
        {editing && (
          <OpsDialog
            title="Edit medical profile"
            subtitle="Update the responder information on file."
            onClose={() => {
              setEditing(false);
              setForm(null);
              setSaveMsg('');
            }}
            wide
          >
            <div className="portal-card page-form" style={{ padding: 0, background: 'transparent', border: 0, boxShadow: 'none' }}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Blood type</span>
                  <input
                    value={profile.bloodType ?? ''}
                    onChange={(e) => update('bloodType', e.target.value)}
                    placeholder="e.g. O+"
                    autoComplete="off"
                  />
                </label>
                <label className="form-field">
                  <span>Allergies</span>
                  <input
                    value={profile.allergies ?? ''}
                    onChange={(e) => update('allergies', e.target.value)}
                    placeholder="e.g. Penicillin"
                    autoComplete="off"
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Medications</span>
                  <textarea
                    value={profile.medications ?? ''}
                    onChange={(e) => update('medications', e.target.value)}
                    rows={3}
                    placeholder="Current medications and dosages"
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Chronic conditions</span>
                  <textarea
                    value={profile.chronicConditions ?? ''}
                    onChange={(e) => update('chronicConditions', e.target.value)}
                    rows={3}
                    placeholder="e.g. Type 2 diabetes"
                  />
                </label>
                <label className="form-field form-field--full">
                  <span>Emergency instructions</span>
                  <textarea
                    value={profile.emergencyNotes ?? ''}
                    onChange={(e) => update('emergencyNotes', e.target.value)}
                    rows={4}
                    placeholder="Notes for first responders (e.g. insulin location, emergency contact)"
                  />
                </label>
                <label className="form-field">
                  <span>Doctor / medical contact</span>
                  <input
                    value={profile.doctorContact ?? ''}
                    onChange={(e) => update('doctorContact', e.target.value)}
                    placeholder="Name and phone"
                  />
                </label>
                <label className="form-field">
                  <span>Ambulance preference</span>
                  <input
                    value={profile.ambulancePreference ?? ''}
                    onChange={(e) => update('ambulancePreference', e.target.value)}
                    placeholder="e.g. Netcare 911"
                  />
                </label>
              </div>

              <div className="page-form-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(false);
                    setForm(null);
                    setSaveMsg('');
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="btn-secondary" onClick={save} disabled={saving}>
                  {saving ? <LoadingSpinner label="" size="sm" /> : 'Save changes'}
                </button>
              </div>
            </div>
          </OpsDialog>
        )}
      </div>
    );
  }

  return (
    <div className="page-content page-content--form">
      <div className="page-header">
        <div>
          <p className="ec-kicker">Medical profile</p>
          <h1>{isComplete ? 'Edit Medical Profile' : 'Set Up Medical Profile'}</h1>
          <p className="text-muted">
            {isComplete
              ? 'Update your medical information for emergency responders.'
              : 'Add your medical details so responders have critical information if you need help.'}
          </p>
        </div>
        {isComplete && (
          <button type="button" className="btn-ghost" onClick={() => { setEditing(false); setForm(null); setSaveMsg(''); }}>
            Cancel
          </button>
        )}
      </div>

      {saveMsg && (
        <div className="alert alert--success" role="status">
          {saveMsg}
        </div>
      )}

      <div className="portal-card page-form">
        <div className="form-grid">
          <label className="form-field">
            <span>Blood type</span>
            <input
              value={profile.bloodType ?? ''}
              onChange={(e) => update('bloodType', e.target.value)}
              placeholder="e.g. O+"
              autoComplete="off"
            />
          </label>
          <label className="form-field">
            <span>Allergies</span>
            <input
              value={profile.allergies ?? ''}
              onChange={(e) => update('allergies', e.target.value)}
              placeholder="e.g. Penicillin"
              autoComplete="off"
            />
          </label>
          <label className="form-field form-field--full">
            <span>Medications</span>
            <textarea
              value={profile.medications ?? ''}
              onChange={(e) => update('medications', e.target.value)}
              rows={3}
              placeholder="Current medications and dosages"
            />
          </label>
          <label className="form-field form-field--full">
            <span>Chronic conditions</span>
            <textarea
              value={profile.chronicConditions ?? ''}
              onChange={(e) => update('chronicConditions', e.target.value)}
              rows={3}
              placeholder="e.g. Type 2 diabetes"
            />
          </label>
          <label className="form-field form-field--full">
            <span>Emergency instructions</span>
            <textarea
              value={profile.emergencyNotes ?? ''}
              onChange={(e) => update('emergencyNotes', e.target.value)}
              rows={4}
              placeholder="Notes for first responders (e.g. insulin location, emergency contact)"
            />
          </label>
          <label className="form-field">
            <span>Doctor / medical contact</span>
            <input
              value={profile.doctorContact ?? ''}
              onChange={(e) => update('doctorContact', e.target.value)}
              placeholder="Name and phone"
            />
          </label>
          <label className="form-field">
            <span>Ambulance preference</span>
            <input
              value={profile.ambulancePreference ?? ''}
              onChange={(e) => update('ambulancePreference', e.target.value)}
              placeholder="e.g. Netcare 911"
            />
          </label>
        </div>

        <div className="page-form-actions">
          <button type="button" className="btn-secondary btn-primary--full" onClick={save} disabled={saving}>
            {saving ? <LoadingSpinner label="" size="sm" /> : isComplete ? 'Save changes' : 'Save profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MedicalSummaryItem({
  label,
  value,
  full,
}: {
  label: string;
  value: string | null;
  full?: boolean;
}) {
  return (
    <div className={`medical-summary-item ${full ? 'medical-summary-item--full' : ''}`}>
      <dt>{label}</dt>
      <dd>{value?.trim() ? value : '—'}</dd>
    </div>
  );
}
