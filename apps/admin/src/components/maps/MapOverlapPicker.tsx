'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLng } from 'leaflet';

export type OverlapPinOption = {
  key: string;
  label: string;
  kind: string;
  onSelect: () => void;
};

type MapOverlapPickerProps = {
  pins: OverlapPinOption[];
  anchor: LatLng | null;
  onClose: () => void;
};

export function MapOverlapPicker({ pins, anchor, onClose }: MapOverlapPickerProps) {
  const map = useMap();
  const panelRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!anchor || pins.length < 2) return;

    const reposition = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const point = map.latLngToContainerPoint(anchor);
      panel.style.left = `${point.x}px`;
      panel.style.top = `${point.y - 12}px`;
    };

    reposition();
    map.on('move zoom', reposition);
    return () => {
      map.off('move zoom', reposition);
    };
  }, [anchor, map, pins.length]);

  if (!anchor || pins.length < 2) return null;

  function scheduleClose() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(onClose, 220);
  }

  function cancelClose() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  return (
    <div
      ref={panelRef}
      className="map-overlap-picker"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <span className="map-overlap-picker__title">
        {pins.length} pins here — pick one
      </span>
      <ul className="map-overlap-picker__list">
        {pins.map((pin) => (
          <li key={pin.key}>
            <button
              type="button"
              className="map-overlap-picker__btn"
              onClick={() => {
                pin.onSelect();
                onClose();
              }}
            >
              <span className={`map-overlap-picker__kind map-overlap-picker__kind--${pin.kind}`}>
                {pin.kind}
              </span>
              {pin.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
