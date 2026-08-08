import Link from 'next/link';
import type { FeatureCard } from '@/lib/portal-nav';
import type { AccessMap } from '@/lib/subscription-plans';
import { featureLink, isLocked } from '@/lib/subscription-plans';

export function FeatureHub({
  title,
  subtitle,
  features,
  access,
  accessKey,
  children,
}: {
  title: string;
  subtitle?: string;
  features: FeatureCard[];
  access?: AccessMap | null;
  accessKey?: keyof AccessMap;
  children?: React.ReactNode;
}) {
  const sectionLocked = isLocked(access ?? null, accessKey);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="text-muted">{subtitle}</p>}
        </div>
        {sectionLocked && accessKey && (
          <Link href={`/portal/subscription/upgrade?addon=${accessKey === 'home' ? 'HOME_SECURITY' : accessKey === 'vehicle' ? 'VEHICLE_RESPONSE' : accessKey === 'family' ? 'FAMILY' : 'MEDICAL_PLUS'}`} className="btn-primary">
            Upgrade plan
          </Link>
        )}
      </div>
      {children}
      <div className="feature-grid">
        {features.map((f) => {
          const locked = f.requiresAccess ? isLocked(access ?? null, f.requiresAccess) : sectionLocked;
          const href = f.href
            ? featureLink(f.href, access ?? null, f.requiresAccess, f.requiresAddon)
            : locked
              ? `/portal/subscription/upgrade${f.requiresAddon ? `?addon=${f.requiresAddon}` : ''}`
              : undefined;

          const inner = (
            <>
              <div className="feature-card-top">
                <h3>{f.title}</h3>
                {locked ? (
                  <span className="feature-status feature-status--locked">Upgrade</span>
                ) : (
                  f.status && <span className="feature-status">{f.status}</span>
                )}
              </div>
              <p>{f.description}</p>
              {f.price && <span className="feature-price">{f.price}</span>}
              <span className="feature-action">
                {locked ? `Add from ${f.price ?? 'subscription'}` : f.action} →
              </span>
            </>
          );

          return href ? (
            <Link key={f.title} href={href} className={`feature-card ${locked ? 'feature-card--locked' : ''}`}>
              {inner}
            </Link>
          ) : (
            <div key={f.title} className="feature-card feature-card--static">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
