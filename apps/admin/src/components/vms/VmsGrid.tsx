'use client';

import type { ReactNode } from 'react';
import type { VmsCamera } from '@/lib/vms/types';
import { VMS_CAMERA_DRAG_TYPE } from './ResourceTree';

export const VMS_LAYOUTS = [1, 4, 9, 16] as const;
export type VmsLayout = (typeof VMS_LAYOUTS)[number];

export function LayoutPicker({
  value,
  onChange,
}: {
  value: VmsLayout;
  onChange: (layout: VmsLayout) => void;
}) {
  return (
    <div className="vms-seg" role="radiogroup" aria-label="Grid layout">
      {VMS_LAYOUTS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={value === n ? 'is-on' : ''}
          onClick={() => onChange(n)}
          title={`${n} window${n === 1 ? '' : 's'}`}
        >
          <LayoutGlyph n={n} />
        </button>
      ))}
    </div>
  );
}

function LayoutGlyph({ n }: { n: number }) {
  const side = Math.sqrt(n);
  const cell = 14 / side;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={1 + (i % side) * cell}
          y={1 + Math.floor(i / side) * cell}
          width={cell - 1}
          height={cell - 1}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

export function VmsGrid({
  layout,
  panes,
  activeIndex,
  onActivate,
  onDropCamera,
  onClear,
  renderPane,
  emptyHint = 'Double-click or drag a camera here',
}: {
  layout: VmsLayout;
  panes: Array<VmsCamera | null>;
  activeIndex: number;
  onActivate: (index: number) => void;
  onDropCamera?: (index: number, cameraId: string) => void;
  onClear?: (index: number) => void;
  renderPane: (camera: VmsCamera, index: number) => ReactNode;
  emptyHint?: string;
}) {
  const side = Math.sqrt(layout);
  return (
    <div
      className="vms-grid"
      style={{ gridTemplateColumns: `repeat(${side}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${side}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: layout }, (_, i) => {
        const cam = panes[i] ?? null;
        return (
          <div
            key={i}
            className={`vms-pane ${i === activeIndex ? 'is-active' : ''} ${cam ? '' : 'is-empty'}`}
            onClick={() => onActivate(i)}
            onDragOver={(e) => {
              if (onDropCamera) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={(e) => {
              const id = e.dataTransfer.getData(VMS_CAMERA_DRAG_TYPE) || e.dataTransfer.getData('text/plain');
              if (id && onDropCamera) {
                e.preventDefault();
                onDropCamera(i, id);
              }
            }}
          >
            {cam ? (
              <>
                {renderPane(cam, i)}
                {onClear ? (
                  <button
                    type="button"
                    className="vms-pane__close"
                    aria-label={`Close ${cam.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear(i);
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </>
            ) : (
              <div className="vms-pane__empty">
                <CameraGlyph />
                <span>{emptyHint}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CameraGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="3" y="7" width="13" height="10" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  );
}
