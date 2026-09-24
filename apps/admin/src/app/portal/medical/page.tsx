'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { UiSelect } from '@/components/ui/UiSelect';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { MEDICAL_PROFILE_CONSENT_NOTICE } from '@/lib/device-security';
import { MEDICAL_AID_SELECT_OPTIONS, showsMedicalAidDetails } from '@/lib/medical-aid';

type MedicalProfile = {
  bloodType: string | null;
  allergies: string | null;
  medications: string | null;
  chronicConditions: string | null;
  emergencyNotes: string | null;
  doctorContact?: string | null;
  ambulancePreference?: string | null;
  medicalAidType?: string | null;
  medicalAidMemberNumber?: string | null;
  medicalAidPlan?: string | null;
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
  const [acceptedMedicalTerms, setAcceptedMedicalTerms] = useState(false);
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
    const needsConsent = !isComplete;
    if (needsConsent && !acceptedMedicalTerms) {
      setSaveMsg('');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      if (needsConsent || acceptedMedicalTerms) {
        await clientApi.post('/client/security/consent', {
          kind: 'MEDICAL_PROFILE',
          accepted: true,
        });
      }
      const aidDetails = showsMedicalAidDetails(current.medicalAidType);
      const res = await clientApi.patch<ApiResponse<MedicalProfile>>('/client/medical', {
        bloodType: current.bloodType,
        allergies: current.allergies,
        medications: current.medications,
        chronicConditions: current.chronicConditions,
        emergencyNotes: current.emergencyNotes,
        doctorContact: current.doctorContact,
        ambulancePreference: current.ambulancePreference,
        medicalAidType: current.medicalAidType,
        medicalAidMemberNumber: aidDetails ? current.medicalAidMemberNumber : '',
        medicalAidPlan: aidDetails ? current.medicalAidPlan : '',
      });
      setForm(res.data);
      setSaveMsg(
        isComplete
          ? 'Medical profile updated.'
          : 'Medical profile saved. Responders can access this in an emergency.',
      );
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

  function updateMany(partial: Partial<MedicalProfile>) {
    setForm((prev) => {
      const base = prev ?? data?.data;
      if (!base) return prev;
      return { ...base, ...partial };
    });
  }

  const fields = (
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
      <label className="form-field">
        <span>Medical aid</span>
        <UiSelect
          value={profile.medicalAidType ?? ''}
          onChange={(medicalAidType) => {
            if (showsMedicalAidDetails(medicalAidType)) {
              update('medicalAidType', medicalAidType);
            } else {
              updateMany({
                medicalAidType,
                medicalAidMemberNumber: '',
                medicalAidPlan: '',
              });
            }
          }}
          compact={false}
          className="form-field-select"
          ariaLabel="Medical aid"
          options={MEDICAL_AID_SELECT_OPTIONS}
        />
      </label>
      {showsMedicalAidDetails(profile.medicalAidType) ? (
        <>
          <label className="form-field">
            <span>Member number</span>
            <input
              value={profile.medicalAidMemberNumber ?? ''}
              onChange={(e) => update('medicalAidMemberNumber', e.target.value)}
              placeholder="Scheme membership number"
              autoComplete="off"
              inputMode="text"
            />
          </label>
          <label className="form-field form-field--full">
            <span>Plan / option (optional)</span>
            <input
              value={profile.medicalAidPlan ?? ''}
              onChange={(e) => update('medicalAidPlan', e.target.value)}
              placeholder="e.g. Executive, Coastal Saver, Comprehensive"
              autoComplete="off"
            />
          </label>
        </>
      ) : null}
      <p className="register-medical-note" style={{ gridColumn: '1 / -1' }}>
        Medical aid and family-doctor details are for first responders during medical emergencies
        only.
      </p>
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
        <span>Family doctor (optional)</span>
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
          placeholder="e.g. Netcare 911, ER24"
        />
      </label>
    </div>
  );

  const consentBlock = !isComplete ? (
    <label className="sec-check" style={{ marginTop: '1rem', display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
      <input
        type="checkbox"
        checked={acceptedMedicalTerms}
        onChange={(e) => setAcceptedMedicalTerms(e.target.checked)}
      />
      <span>
        {MEDICAL_PROFILE_CONSENT_NOTICE}{' '}
        <Link href="/portal/security/legal#medical">Read medical data policy</Link>.
      </span>
    </label>
  ) : (
    <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
      Medical and medical-aid details are processed under your recorded consent.{' '}
      <Link href="/portal/security/legal#medical">Review policy</Link>.
    </p>
  );

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
            <MedicalSummaryItem label="Medical aid" value={profile.medicalAidType ?? null} />
            {showsMedicalAidDetails(profile.medicalAidType) ? (
              <>
                <MedicalSummaryItem label="Member number" value={profile.medicalAidMemberNumber ?? null} />
                <MedicalSummaryItem label="Plan / option" value={profile.medicalAidPlan ?? null} />
              </>
            ) : null}
            <MedicalSummaryItem label="Medications" value={profile.medications} full />
            <MedicalSummaryItem label="Chronic conditions" value={profile.chronicConditions} full />
            <MedicalSummaryItem label="Emergency instructions" value={profile.emergencyNotes} full />
            <MedicalSummaryItem label="Family doctor" value={profile.doctorContact ?? null} />
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
              setAcceptedMedicalTerms(false);
            }}
            wide
          >
            <div className="portal-card page-form" style={{ padding: 0, background: 'transparent', border: 0, boxShadow: 'none' }}>
              {fields}
              {consentBlock}
              <div className="page-form-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(false);
                    setForm(null);
                    setSaveMsg('');
                    setAcceptedMedicalTerms(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={save}
                  disabled={saving || (!isComplete && !acceptedMedicalTerms)}
                >
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
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setEditing(false);
              setForm(null);
              setSaveMsg('');
              setAcceptedMedicalTerms(false);
            }}
          >
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
        {fields}
        {consentBlock}
        {!isComplete && !acceptedMedicalTerms ? (
          <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            Accept the medical data policy to save.
          </p>
        ) : null}
        <div className="page-form-actions">
          <button
            type="button"
            className="btn-secondary btn-primary--full"
            onClick={save}
            disabled={saving || (!isComplete && !acceptedMedicalTerms)}
          >
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
