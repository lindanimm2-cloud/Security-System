'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  PLATFORM_DISCLAIMER,
  capabilityGlyph,
  compatibilityFor,
  detectClient,
  type CompatibilityReport,
  type DeviceCapabilityMap,
} from '@/lib/platform';

const CAP_LABELS: { key: keyof DeviceCapabilityMap; label: string }[] = [
  { key: 'notifications', label: 'Notifications' },
  { key: 'haptics', label: 'Haptics' },
  { key: 'vibration', label: 'Vibration' },
  { key: 'sound', label: 'Sound' },
  { key: 'sos', label: 'SOS' },
  { key: 'location', label: 'Location' },
  { key: 'backgroundLocation', label: 'Background location' },
  { key: 'independentNetwork', label: 'Independent connection' },
  { key: 'background', label: 'Background' },
  { key: 'bluetooth', label: 'Bluetooth' },
  { key: 'camera', label: 'Camera' },
  { key: 'microphone', label: 'Microphone' },
  { key: 'phone', label: 'Phone' },
  { key: 'sensors', label: 'Sensors' },
];

export default function CompatibilityPage() {
  const [report, setReport] = useState<CompatibilityReport | null>(null);

  useEffect(() => {
    const detected = detectClient();
    setReport(compatibilityFor(detected.platform));
  }, []);

  const tone = useMemo(() => {
    if (!report) return 'muted';
    if (report.support === 'supported') return 'ok';
    if (report.support === 'limited') return 'warn';
    if (report.support === 'planned') return 'info';
    return 'bad';
  }, [report]);

  return (
    <div className="apps-hub apps-hub--compat">
      <header className="apps-hub__hero">
        <p className="apps-hub__kicker">4DS compatibility</p>
        <h1>Device compatibility</h1>
        <p className="apps-hub__lead">
          Capability detection drives what 4DS offers on this runtime. Limited does not mean broken —
          it means the web/PWA path cannot match native emergency channels.
        </p>
      </header>

      {report ? (
        <section className={`apps-compat apps-compat--${tone}`}>
          <p className="dash-ops__eyebrow">This device</p>
          <h2>{report.deviceLabel}</h2>
          <p className="apps-compat__platform">Platform · {report.platform}</p>
          <p className={`apps-compat__support apps-compat__support--${tone}`}>
            {report.support === 'supported'
              ? '🟢'
              : report.support === 'limited'
                ? '🟠'
                : report.support === 'planned'
                  ? '🔵'
                  : '🔴'}{' '}
            {report.supportLabel}
          </p>

          <ul className="apps-compat__caps">
            {CAP_LABELS.map((row) => (
              <li key={row.key}>
                <span>{row.label}</span>
                <strong>
                  {capabilityGlyph(report.capabilities[row.key])} {report.capabilities[row.key]}
                </strong>
              </li>
            ))}
          </ul>

          <ul className="apps-hub__notes">
            {report.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-muted">Checking this browser…</p>
      )}

      <p className="text-muted">{PLATFORM_DISCLAIMER}</p>
      <div className="apps-hub__quick">
        <Link href="/apps" className="btn-sm btn-primary">
          Get the 4DS app
        </Link>
        <Link href="/portal/security/permissions" className="btn-sm btn-secondary">
          Emergency permissions
        </Link>
      </div>
    </div>
  );
}
