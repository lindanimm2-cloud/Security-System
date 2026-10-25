'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { LoginPageChrome } from '@/components/LoginPageChrome';
import { ENGAGEMENT_FLOW_STEPS, markPortalWelcomeSeen } from '@/lib/temp-engagements';

export default function PortalWelcomePage() {
  const router = useRouter();

  useEffect(() => {
    markPortalWelcomeSeen();
  }, []);

  function continueToLogin() {
    markPortalWelcomeSeen();
    router.push('/portal/login');
  }

  return (
    <div className="login-page login-page--v2">
      <LoginPageChrome />
      <div className="login-page__inner">
        <div className="login-card login-card--v2 portal-welcome-card">
          <div className="login-brand login-brand--v2">
            <BrandMark variant="portal" />
            <h1>Welcome to 4DS</h1>
            <p>
              Temporary protection jobs — escort, close protection, and response — with a slim
              portal for the duration of the engagement.
            </p>
          </div>

          <ol className="portal-welcome-steps">
            {ENGAGEMENT_FLOW_STEPS.map((step, index) => (
              <li key={step}>
                <span aria-hidden>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>

          <div className="portal-welcome-actions">
            <button type="button" className="login-submit" onClick={continueToLogin}>
              Continue to sign in
            </button>
            <Link href="/apps" className="btn-sm btn-secondary">
              Download the app
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
