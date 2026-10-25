'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { LoginPageChrome } from '@/components/LoginPageChrome';
import { getSession } from '@/lib/auth';
import {
  ENGAGEMENT_FLOW_STEPS,
  getActiveEngagementForEmail,
  markPortalWelcomeSeen,
  nextPortalPathAfterAuth,
} from '@/lib/temp-engagements';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function PortalWelcomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const session = getSession('client');
    setSignedIn(Boolean(session));
    setReady(true);
  }, []);

  function continueOnboarding() {
    markPortalWelcomeSeen();
    const session = getSession('client');
    if (!session) {
      router.push('/portal/login');
      return;
    }
    router.push(
      nextPortalPathAfterAuth({
        mustChangePassword: session.user.mustChangePassword,
        email: session.user.email,
        engagement: getActiveEngagementForEmail(session.user.email),
      }),
    );
  }

  if (!ready) {
    return <LoadingSpinner label="Loading…" fullScreen />;
  }

  return (
    <div className="login-page login-page--v2 portal-welcome-page">
      <LoginPageChrome />
      <div className="login-page__inner">
        <div className="login-card login-card--v2 portal-welcome-card">
          <div className="login-brand login-brand--v2">
            <BrandMark variant="portal" />
            <h1>Welcome to 4DS</h1>
            <p>
              Escort, close protection, and response jobs use a slim control-panel portal for the
              duration of the engagement — live check-ins, panic, and control room contact.
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
            <button type="button" className="login-submit" onClick={continueOnboarding}>
              {signedIn ? 'Continue to portal' : 'Continue to sign in'}
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
