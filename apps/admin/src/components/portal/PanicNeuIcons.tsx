type IconProps = { className?: string };

export function PanicAlertIcon({ className = 'panic-neu__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3 2.5 19.5h19L12 3z" strokeLinejoin="round" />
      <path d="M12 9v5M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}

export function SilentPanicIcon({ className = 'panic-neu__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
      <path d="m16 9 5 5M21 9l-5 5" strokeLinecap="round" />
    </svg>
  );
}

export function MedicalPanicIcon({ className = 'panic-neu__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

export function FirePanicIcon({ className = 'panic-neu__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        d="M12 22c4-2.5 6.5-5.5 6.5-9.5C18.5 8 15 5 12 2 9 5 5.5 8 5.5 12.5 5.5 16.5 8 19.5 12 22z"
        strokeLinejoin="round"
      />
      <path d="M12 22c-1.5-2-2-4-2-6 0-2 2-4 2-4s2 2 2 4c0 2-.5 4-2 6z" strokeLinejoin="round" />
    </svg>
  );
}

export function HubPanicIcon({ className = 'panic-neu__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
