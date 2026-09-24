'use client';

import { useCallback, useEffect, useId, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { PUBLIC_LEGAL_PATH } from '@/lib/legal-content';
import { LegalDocumentMeta, LegalDocumentSections } from './LegalDocumentSections';

/**
 * Inline trigger for the terms & privacy instrument. Opens an overlay instead of
 * navigating so a part-completed registration form is never unmounted.
 * Never use an <a href="/portal/..."> here — those routes are auth-gated.
 */
export function LegalPolicyLink({
  label = 'terms & privacy policy',
  section,
  className,
}: {
  label?: string;
  section?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  function openDialog(e: SyntheticEvent) {
    /* Nested inside consent <label> elements — never toggle the checkbox or submit. */
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className={className ? `legal-link ${className}` : 'legal-link'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openDialog}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {label}
      </button>
      {open ? <LegalPolicyDialog section={section} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function LegalPolicyDialog({ section, onClose }: { section?: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    setMounted(true);
    const restoreFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      restoreFocus?.focus?.();
    };
  }, []);

  const attachBody = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      node.focus({ preventScroll: true });
      if (!section) return;
      const target = node.querySelector(`#${CSS.escape(section)}`);
      target?.scrollIntoView({ block: 'start' });
    },
    [section],
  );

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="legal-modal"
      role="presentation"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="legal-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="legal-modal__head">
          <div>
            <p className="legal-modal__kicker">Policy instrument</p>
            <h1 id={titleId}>Service terms, privacy &amp; consent</h1>
          </div>
          <button
            type="button"
            className="legal-modal__close"
            onClick={onClose}
            aria-label="Close terms"
          >
            ×
          </button>
        </header>
        <LegalDocumentMeta />
        <div className="legal-modal__body" ref={attachBody} tabIndex={-1}>
          <LegalDocumentSections />
        </div>
        <footer className="legal-modal__foot">
          <a
            className="legal-modal__external"
            href={PUBLIC_LEGAL_PATH}
            target="_blank"
            rel="noreferrer"
          >
            Open full page in new tab
          </a>
          <button type="button" className="legal-modal__done" onClick={onClose}>
            Back to form
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
