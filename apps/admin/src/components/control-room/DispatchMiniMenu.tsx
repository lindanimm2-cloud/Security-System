'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DispatchOfficerMenuContent } from './DispatchOfficerMenuContent';

type DispatchMiniMenuProps = {
  incidentId: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  onAssigned?: () => void;
};

export function DispatchMiniMenu({
  incidentId,
  anchorRef,
  open,
  onClose,
  onAssigned,
}: DispatchMiniMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    function place() {
      const rect = anchorRef.current!.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const gap = 8;
      const pad = 12;
      const height = panelRef.current?.offsetHeight || Math.min(window.innerHeight * 0.45, 320);
      const below = rect.bottom + gap;
      const spaceBelow = window.innerHeight - pad - below;
      const spaceAbove = rect.top - pad - gap;
      const openAbove = height > spaceBelow && spaceAbove > spaceBelow;
      const top = openAbove
        ? Math.max(pad, rect.top - height - gap)
        : below;
      setPosition({ top, left });
    }

    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: Event) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="ops-menu__scrim"
        aria-label="Close dispatch menu"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="dispatch-mini-menu"
        style={{ top: position.top, left: position.left }}
        role="dialog"
        aria-label="Dispatch officer menu"
      >
        <DispatchOfficerMenuContent
          incidentId={incidentId}
          compact
          onAssigned={onAssigned}
          onClose={onClose}
        />
      </div>
    </>,
    document.body,
  );
}
