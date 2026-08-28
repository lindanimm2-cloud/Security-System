export const CrmEyeLensIcons = {
  Eye({ active }: { active?: boolean }) {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M2.5 12s3.8-6.5 9.5-6.5S21.5 12 21.5 12 17.7 18.5 12 18.5 2.5 12 2.5 12z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r={active ? 1.55 : 1.15} fill="currentColor" />
        <path d="M12 5.5v1.2M12 17.3v1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  },
  Panic() {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3 3.2 19h17.6L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="16.6" r="1" fill="currentColor" />
      </svg>
    );
  },
  Map() {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M9 4.5l6 2.2 5-2.2v14.2l-5 2.2-6-2.2-5 2.2V6.7l5-2.2z" />
        <path d="M9 4.5v14.2M15 6.7v14.2" />
      </svg>
    );
  },
  Bell() {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M6.2 9.2a5.8 5.8 0 0111.6 0c0 4.2 1.4 5.4 1.4 5.4H4.8s1.4-1.2 1.4-5.4z" />
        <path d="M10 18.6a2 2 0 004 0" />
      </svg>
    );
  },
  Chat() {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M5 5.5h14a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5H9.2L5 20.2V7A1.5 1.5 0 015 5.5z" />
      </svg>
    );
  },
  Phone() {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M7.2 3.8l2.4 2.4a1.2 1.2 0 010 1.7l-1.3 1.3a12.5 12.5 0 006.5 6.5l1.3-1.3a1.2 1.2 0 011.7 0l2.4 2.4a1.2 1.2 0 010 1.7l-1.5 1.5c-.8.8-2 .9-3 .5A18.5 18.5 0 014.2 7.3c-.4-1-.3-2.2.5-3l1.5-1.5a1.2 1.2 0 011.7 0z" />
      </svg>
    );
  },
  Search() {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="11" cy="11" r="6.2" />
        <path d="M16 16l4.2 4.2" />
      </svg>
    );
  },
  Fleet() {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M3 16V8.5A1.5 1.5 0 014.5 7h9A1.5 1.5 0 0115 8.5V16" />
        <path d="M15 11h3.2L21 14v2h-2" />
        <circle cx="6.5" cy="16.5" r="1.7" />
        <circle cx="17.5" cy="16.5" r="1.7" />
      </svg>
    );
  },
  Calendar() {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <rect x="4" y="5.5" width="16" height="14" rx="2" />
        <path d="M8 3.8v3.2M16 3.8v3.2M4 10h16" />
        <path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h.01M12 17h.01" />
      </svg>
    );
  },
  Display({ dark }: { dark: boolean }) {
    return dark ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M21 14.5A7.5 7.5 0 0 1 9.5 3 6 6 0 1 0 14.5 21"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  },
  Drag() {
    return (
      <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden>
        <circle cx="5" cy="3.5" r="1.55" />
        <circle cx="11" cy="3.5" r="1.55" />
        <circle cx="5" cy="9" r="1.55" />
        <circle cx="11" cy="9" r="1.55" />
        <circle cx="5" cy="14.5" r="1.55" />
        <circle cx="11" cy="14.5" r="1.55" />
      </svg>
    );
  },
  Expand() {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  },
};
