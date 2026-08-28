'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { friendlyErrorMessage } from '@/lib/friendly-error';

export type FamilyProfilePerson = {
  id: string;
  name: string;
  nickname?: string | null;
  trackingEnabled: boolean;
  lastLocationAt?: string | null;
  phone?: string | null;
  userId?: string | null;
  familyMessagingEnabled?: boolean;
};

export function FamilyProfilePopup({
  person,
  onClose,
}: {
  person: FamilyProfilePerson;
  onClose: () => void;
}) {
  const calls = useCallsOptional();
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const display = person.nickname?.trim() || firstName(person.name);
  const [first, last] = splitName(person.name, display);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  async function call() {
    const phone = person.phone ?? undefined;
    if (calls) {
      setBusy(true);
      try {
        await calls.startCall(person.userId ? 'INTERNAL' : 'EXTERNAL', {
          name: person.name,
          phone,
          userId: person.userId ?? person.id,
          role: 'FAMILY_MEMBER',
        });
        onClose();
      } catch (err) {
        alert(friendlyErrorMessage(err, 'call'));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (phone) window.location.href = `tel:${phone}`;
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fam-profile-overlay" onClick={onClose} role="presentation">
      <article
        className="fam-profile-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fam-profile-name"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="fam-profile-card__close" onClick={onClose} aria-label="Close profile">
          ×
        </button>
        <UserAvatar firstName={first} lastName={last} size="lg" />
        <div className="fam-profile-card__body">
          <h2 id="fam-profile-name">{display}</h2>
          {person.trackingEnabled ? (
            <p className="fam-profile-card__status fam-profile-card__status--on">
              <ShieldIcon />
              Protected · tracking on
            </p>
          ) : (
            <p className="fam-profile-card__status">Tracking off</p>
          )}
          {person.trackingEnabled ? (
            <p className="fam-profile-card__seen">Last seen: {lastSeenLabel(person.lastLocationAt)}</p>
          ) : null}
          <div className="fam-profile-card__actions">
            <button type="button" className="fam-profile-btn fam-profile-btn--call" disabled={busy} onClick={() => void call()}>
              {busy ? 'Calling…' : 'Call'}
            </button>
            <Link href="/portal/family/chat" className="fam-profile-btn" onClick={onClose}>
              Message
            </Link>
            <Link
              href={`/portal/location?member=${encodeURIComponent(person.id)}`}
              className="fam-profile-btn"
              onClick={onClose}
            >
              Location
            </Link>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || full;
}

function splitName(full: string, display: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' ')];
  return [display, ''];
}

function lastSeenLabel(iso?: string | null) {
  if (!iso) return 'recently';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.max(1, Math.round(ms / 60_000))} min ago`;
  if (ms < 86_400_000) return `${Math.max(1, Math.round(ms / 3_600_000))}h ago`;
  return new Date(iso).toLocaleString();
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M12 2 4 6v6c0 5 3.4 9.4 8 10.5C16.6 21.4 20 17 20 12V6l-8-4z" />
    </svg>
  );
}
