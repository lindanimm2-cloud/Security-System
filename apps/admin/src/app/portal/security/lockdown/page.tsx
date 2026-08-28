'use client';

import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { SecurityArticle, SecurityDocFrame } from '@/components/security/SecurityDocFrame';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

const EFFECTS = [
  'Everyone currently signed in on this account is signed out.',
  'Saved phones and browsers cannot get back in until you turn lockdown off.',
  'You can still get help: use Emergency access with your password, or Silent Panic if this page is still open.',
  'Control room can still take a Panic. This does not replace calling 10111.',
];

export default function LockdownPage() {
  return (
    <PortalLayout>
      <LockdownContent />
    </PortalLayout>
  );
}

function LockdownContent() {
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<{ lockdownActive: boolean }>>('/client/security/status'),
    [],
  );
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');

  async function activate() {
    try {
      await clientApi.post('/client/security/lockdown', { reason: 'Client initiated' });
      setOpen(false);
      setMsg('Lockdown is on. Other devices are signed out. You can still use Emergency access.');
      void reload();
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'action'));
    }
  }

  async function cancel() {
    await clientApi.post('/client/security/lockdown/cancel');
    void reload();
  }

  if (loading) return <LoadingSpinner label="Loading protection…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const active = Boolean(data?.data.lockdownActive);

  return (
    <div className="page-content sec-page">
      <SecurityDocFrame
        docId="DIR-LOCK-01"
        kicker="Directive G"
        stamp={active ? 'Active · Lockdown' : 'Restricted · Client'}
        title={active ? 'Your account is locked down' : 'Lock down this account'}
        summary="Use this if a phone is stolen or you think someone else is in your account. It signs everyone out. You can still reach the control room."
        toc={[
          { id: 'effect', label: 'What it does' },
          { id: 'execute', label: 'Turn it on' },
          { id: 'file', label: 'Protection file', href: '/portal/security' },
        ]}
      >
        <SecurityArticle id="effect" number="01" title="What lockdown does">
          <ol className="sec-clauses sec-clauses--tight">
            {EFFECTS.map((text, i) => (
              <li key={text}>
                <em>1.{i + 1}</em>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </SecurityArticle>

        <SecurityArticle id="execute" number="02" title="Turn it on">
          {msg ? <p className="alert">{msg}</p> : null}
          {active ? (
            <button type="button" className="btn-secondary" onClick={() => void cancel()}>
              Turn lockdown off
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
              Lock my account
            </button>
          )}
        </SecurityArticle>
      </SecurityDocFrame>
      {open ? (
        <OpsDialog title="Lock this account?" onClose={() => setOpen(false)}>
          <p>Everyone signed in will be signed out. Saved phones cannot get back in until you turn this off.</p>
          <button type="button" className="btn-primary" onClick={() => void activate()}>
            Yes, lock my account
          </button>
        </OpsDialog>
      ) : null}
    </div>
  );
}
