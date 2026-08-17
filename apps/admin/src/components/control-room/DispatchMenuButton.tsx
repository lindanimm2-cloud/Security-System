'use client';

import { useRef, useState, type ReactNode } from 'react';
import { DispatchMiniMenu } from './DispatchMiniMenu';

type DispatchMenuButtonProps = {
  incidentId: string;
  className?: string;
  label?: ReactNode;
  onAssigned?: () => void;
};

export function DispatchMenuButton({
  incidentId,
  className = 'btn-sm btn-primary',
  label = 'Dispatch',
  onAssigned,
}: DispatchMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      <DispatchMiniMenu
        incidentId={incidentId}
        anchorRef={buttonRef}
        open={open}
        onClose={() => setOpen(false)}
        onAssigned={() => {
          onAssigned?.();
          setOpen(false);
        }}
      />
    </>
  );
}
