import type { ReactNode } from 'react';
import type { EmergencyPermissionId } from '@/lib/emergency-permissions';

const ICONS: Record<EmergencyPermissionId, ReactNode> = {
  notifications: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  alert_sound: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  vibration: (
    <>
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M4 8v8M2 10v4M20 8v8M22 10v4" />
    </>
  ),
  location: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  phone: (
    <>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </>
  ),
  microphone: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  contacts: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  bluetooth: (
    <>
      <path d="m7 7 10 10-5 5V2l5 5L7 17" />
    </>
  ),
  background: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M7 11h.01M11 11h6" />
      <path d="M17 4v3M7 4v3" />
    </>
  ),
  sos: (
    <>
      <path d="M12 3 3 20h18L12 3z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
};

type EmPermIconProps = {
  id: EmergencyPermissionId;
  className?: string;
  size?: number;
};

/** Monochrome stroke glyphs for emergency permission rows — ops desk, not emoji. */
export function EmPermIcon({ id, className = '', size = 18 }: EmPermIconProps) {
  return (
    <svg
      className={`em-perm-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[id]}
    </svg>
  );
}
