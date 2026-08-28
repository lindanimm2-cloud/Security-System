import type { ReactNode } from 'react';

export type SketchIconName =
  | 'shield'
  | 'building'
  | 'mail'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'sign-in'
  | 'monitor'
  | 'officer'
  | 'secure'
  | 'arrow-left';

const ICONS: Record<SketchIconName, ReactNode> = {
  shield: (
    <>
      <path d="M12 2.8c-3.2 1.1-5.8 1.4-8.2 1.6v7.1c0 4.8 3.4 8.6 8.2 10.5 4.8-1.9 8.2-5.7 8.2-10.5V4.4c-2.4-.2-5-.5-8.2-1.6z" />
      <path d="M9.2 12.1l2.1 2.2 4.3-4.6" />
    </>
  ),
  building: (
    <>
      <path d="M5.2 20.5V8.4l6.8-3.6 6.8 3.6v12.1" />
      <path d="M9.5 20.5v-4.2h5v4.2" />
      <path d="M9.8 10.2h.01M12 10.2h.01M14.2 10.2h.01" />
      <path d="M9.8 13.4h.01M12 13.4h.01M14.2 13.4h.01" />
    </>
  ),
  mail: (
    <>
      <path d="M3.8 6.8h16.4c.9 0 1.6.7 1.6 1.6v8.2c0 .9-.7 1.6-1.6 1.6H3.8c-.9 0-1.6-.7-1.6-1.6V8.4c0-.9.7-1.6 1.6-1.6z" />
      <path d="M4.2 7.4l7.6 5.3 7.6-5.3" />
    </>
  ),
  lock: (
    <>
      <path d="M7.4 10.6V8.4a4.6 4.6 0 0 1 9.2 0v2.2" />
      <path d="M6.2 10.6h11.6c.8 0 1.4.6 1.4 1.4v7.2c0 .8-.6 1.4-1.4 1.4H6.2c-.8 0-1.4-.6-1.4-1.4v-7.2c0-.8.6-1.4 1.4-1.4z" />
      <path d="M12 14.3v2.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12.2s3.6-6.2 9.6-6.2 9.6 6.2 9.6 6.2-3.6 6.2-9.6 6.2-9.6-6.2-9.6-6.2z" />
      <circle cx="12" cy="12.2" r="2.6" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3.1 3.1l17.8 17.8" />
      <path d="M5.6 8.4s2.8-3.8 6.4-4.8M18.4 15.9s-2.8 3.8-6.4 4.8" />
      <path d="M9.8 9.9a2.8 2.8 0 0 0 3.9 3.9" />
    </>
  ),
  'sign-in': (
    <>
      <path d="M8.2 12h9.8" />
      <path d="M14.8 8.4L18.4 12l-3.6 3.6" />
      <path d="M5.6 5.8V6.8a2.2 2.2 0 0 0 2.2 2.2h3.2" />
      <path d="M5.6 18.2v-1a2.2 2.2 0 0 1 2.2-2.2h3.2" />
    </>
  ),
  monitor: (
    <>
      <path d="M3.6 5.4h16.8c.8 0 1.4.6 1.4 1.4v9.2c0 .8-.6 1.4-1.4 1.4H3.6c-.8 0-1.4-.6-1.4-1.4V6.8c0-.8.6-1.4 1.4-1.4z" />
      <path d="M9.8 19.8h4.4" />
      <path d="M12 16.4v3.4" />
    </>
  ),
  officer: (
    <>
      <path d="M12 3.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.1l.9-5.4-3.9-3.8 5.4-.8L12 3.2z" />
    </>
  ),
  secure: (
    <>
      <path d="M12 2.6c-2.8 1-5.2 1.3-7.4 1.5v6.4c0 4.2 3 7.6 7.4 9.2 4.4-1.6 7.4-5 7.4-9.2V4.1c-2.2-.2-4.6-.5-7.4-1.5z" />
      <path d="M9.4 11.8l1.8 1.9 3.6-3.8" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19.2 12H5.4" />
      <path d="M10.2 6.8L5.2 12l5 5.2" />
    </>
  ),
};

type SketchIconProps = {
  name: SketchIconName;
  className?: string;
  size?: number;
};

export function SketchIcon({ name, className = '', size = 20 }: SketchIconProps) {
  return (
    <svg
      className={`sketch-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}
