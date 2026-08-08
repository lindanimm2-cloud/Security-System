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
      const width = 360;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const top = rect.bottom + 8;
      setPosition({ top, left });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
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
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open) return null;

  return createPortal(
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
    </div>,
    document.body,
  );
}
