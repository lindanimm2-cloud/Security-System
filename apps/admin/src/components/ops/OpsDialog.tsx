'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function OpsDialog({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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

  if (!mounted) return null;

  return createPortal(
    <div className="modal-overlay ops-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-card ops-dialog ${wide ? 'modal-card--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ops-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ops-dialog__head">
          <div>
            <h3 id="ops-dialog-title">{title}</h3>
            {subtitle ? <p className="text-muted ops-dialog__sub">{subtitle}</p> : null}
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
