'use client';

import { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import type { DivIcon, LatLngExpression, Marker as LeafletMarker } from 'leaflet';

type AnimatedMarkerProps = {
  position: { lat: number; lng: number };
  icon: DivIcon;
  selected?: boolean;
  riseOnHover?: boolean;
  overlapGroupSize?: number;
  children?: React.ReactNode;
  onSelect?: () => void;
  onOverlapHover?: () => void;
  onOverlapLeave?: () => void;
  markerRef?: (marker: LeafletMarker | null) => void;
  popupMaxWidth?: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function AnimatedMarker({
  position,
  icon,
  selected,
  riseOnHover = false,
  overlapGroupSize = 1,
  children,
  onSelect,
  onOverlapHover,
  onOverlapLeave,
  markerRef,
  popupMaxWidth = 280,
}: AnimatedMarkerProps) {
  const internalRef = useRef<LeafletMarker | null>(null);
  const animRef = useRef<number | null>(null);
  const currentRef = useRef(position);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const marker = internalRef.current;
    if (!marker) return;

    const from = { ...currentRef.current };
    const to = position;
    const start = performance.now();
    const duration = 900;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const lat = lerp(from.lat, to.lat, eased);
      const lng = lerp(from.lng, to.lng, eased);
      marker.setLatLng([lat, lng]);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = to;
      }
    };

    if (from.lat === to.lat && from.lng === to.lng) return;
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [position.lat, position.lng]);

  const latLng: LatLngExpression = [currentRef.current.lat, currentRef.current.lng];

  return (
    <Marker
      ref={(marker) => {
        internalRef.current = marker;
        markerRef?.(marker);
      }}
      position={latLng}
      icon={icon}
      zIndexOffset={selected ? 1000 : overlapGroupSize > 1 ? 200 : 0}
      riseOnHover={riseOnHover}
      riseOffset={1200}
      eventHandlers={{
        click: () => onSelect?.(),
        mouseover: () => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          onOverlapHover?.();
        },
        mouseout: () => {
          hideTimer.current = setTimeout(() => onOverlapLeave?.(), 200);
        },
      }}
    >
      {children && <Popup maxWidth={popupMaxWidth} minWidth={220} className="map-popup--compact">{children}</Popup>}
    </Marker>
  );
}
