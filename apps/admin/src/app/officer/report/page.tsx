'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { ReportAttachments } from '@/components/officer/ReportAttachments';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { submitAssignmentReport, submitFieldIncidentReport } from '@/lib/officer-report-api';
import { UiSelect } from '@/components/ui/UiSelect';

type Assignment = {
  dispatchId: string;
  incidentId: string;
  type: string;
  status: string;
  title: string | null;
  address: string | null;
};

const FIELD_TYPES = ['OTHER', 'ASSAULT', 'THEFT', 'MEDICAL', 'FIRE'] as const;

export default function OfficerReportPage() {
  return (
    <OfficerLayout title="Incident Report">
      <ReportContent />
    </OfficerLayout>
  );
}

function ReportContent() {
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<Assignment[]>>('/officer/incidents/assignments'),
    [],
  );

  const [tab, setTab] = useState<'assignment' | 'field'>('assignment');
  const [selectedId, setSelectedId] = useState('');
  const [fieldType, setFieldType] = useState<string>('OTHER');
  const [fieldTitle, setFieldTitle] = useState('');
  const [fieldAddress, setFieldAddress] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const assignments = data?.data ?? [];

  useEffect(() => {
    if (assignments.length > 0 && !selectedId) {
      setSelectedId(assignments[0].incidentId);
    }
  }, [assignments, selectedId]);

  async function handleAssignmentReport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || (!content.trim() && attachments.length === 0)) return;
    setSubmitting(true);
    setMsg('');
    setErr('');
    try {
      const res = await submitAssignmentReport(selectedId, content.trim(), attachments);
      setContent('');
      setAttachments([]);
      const count = res.data.media?.length ?? 0;
      setMsg(
        count > 0
          ? `Field report submitted with ${count} attachment${count > 1 ? 's' : ''}.`
          : 'Field report submitted to control room.',
      );
      reload();
    } catch (ex) {
      setErr(friendlyErrorMessage(ex, 'save'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFieldReport(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;
    setSubmitting(true);
    setMsg('');
    setErr('');
    try {
      const res = await submitFieldIncidentReport(
        {
          type: fieldType,
          title: fieldTitle || undefined,
          address: fieldAddress || undefined,
          description: content.trim(),
        },
        attachments,
      );
      setContent('');
      setFieldTitle('');
      setFieldAddress('');
      setAttachments([]);
      const count = res.data.media?.length ?? 0;
      setMsg(
        count > 0
          ? `Field incident reported with ${count} attachment${count > 1 ? 's' : ''}. Dispatch notified.`
          : 'New field incident reported. Dispatch has been notified.',
      );
    } catch (ex) {
      setErr(friendlyErrorMessage(ex, 'save'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading assignments..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <>
      <div className="report-tabs">
        <button
          type="button"
          className={`report-tab ${tab === 'assignment' ? 'report-tab--active' : ''}`}
          onClick={() => {
            setTab('assignment');
            setAttachments([]);
          }}
        >
          Report on assignment
        </button>
        <button
          type="button"
          className={`report-tab ${tab === 'field' ? 'report-tab--active' : ''}`}
          onClick={() => {
            setTab('field');
            setAttachments([]);
          }}
        >
          New field incident
        </button>
      </div>

      {msg && <div className="alert alert--success">{msg}</div>}
      {err && <ErrorAlert error={err} />}

      {tab === 'assignment' ? (
        <section className="portal-card">
          <h2>Report on active assignment</h2>
          <p className="text-muted">
            Submit situational updates, scene findings, or resolution notes to dispatch.
          </p>
          {assignments.length === 0 ? (
            <p className="text-muted">
              No active assignments.{' '}
              <Link href="/officer/queue" className="interactive-text">View queue</Link>
            </p>
          ) : (
            <form className="incident-report-form" onSubmit={handleAssignmentReport}>
              <label>
                Assignment
                <UiSelect
                  compact={false}
                  ariaLabel="Assignment"
                  value={selectedId}
                  onChange={setSelectedId}
                  options={assignments.map((a) => ({
                    value: a.incidentId,
                    label: `${a.type} — ${a.title ?? a.address ?? 'Active job'}`,
                  }))}
                />
              </label>
              <label>
                Field report
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder="On-scene observations, suspect description, actions taken..."
                />
              </label>
              <ReportAttachments
                files={attachments}
                onChange={setAttachments}
                disabled={submitting}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || (!content.trim() && attachments.length === 0)}
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </form>
          )}
        </section>
      ) : (
        <section className="portal-card">
          <h2>Report new field incident</h2>
          <p className="text-muted">
            Log suspicious activity or emergencies observed while on patrol.
          </p>
          <form className="incident-report-form" onSubmit={handleFieldReport}>
            <div className="incident-report-form__grid">
              <label>
                Type
                <UiSelect
                  compact={false}
                  ariaLabel="Incident type"
                  value={fieldType}
                  onChange={setFieldType}
                  options={FIELD_TYPES.map((t) => ({
                    value: t,
                    label: t.replace('_', ' '),
                  }))}
                />
              </label>
              <label>
                Title
                <input
                  type="text"
                  value={fieldTitle}
                  onChange={(e) => setFieldTitle(e.target.value)}
                  placeholder="Brief summary"
                />
              </label>
              <label className="incident-report-form__full">
                Location
                <input
                  type="text"
                  value={fieldAddress}
                  onChange={(e) => setFieldAddress(e.target.value)}
                  placeholder="Street or landmark"
                />
              </label>
              <label className="incident-report-form__full">
                Report details
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder="What did you observe? Who is involved? Immediate risks?"
                />
              </label>
              <div className="incident-report-form__full">
                <ReportAttachments
                  files={attachments}
                  onChange={setAttachments}
                  disabled={submitting}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || (!content.trim() && attachments.length === 0)}
            >
              {submitting ? 'Submitting…' : 'Report field incident'}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
