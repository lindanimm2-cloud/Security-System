import type { Map as LeafletMap } from 'leaflet';

function mapHasSize(map: LeafletMap) {
  try {
    map.invalidateSize({ animate: false });
    const size = map.getSize();
    return size.x > 0 && size.y > 0;
  } catch {
    return false;
  }
}

/** Leaflet flyTo/setView throws Invalid LatLng (NaN, NaN) when the pane is 0×0. */
export function safeSetView(
  map: LeafletMap,
  lat: number,
  lng: number,
  zoom?: number,
) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (!mapHasSize(map)) return false;
  try {
    map.setView([lat, lng], zoom ?? Math.max(map.getZoom(), 12), { animate: false });
    return true;
  } catch {
    return false;
  }
}

export function safeFitBounds(map: LeafletMap, points: [number, number][], options?: { padding?: [number, number]; maxZoom?: number }) {
  const valid = points.filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  if (valid.length < 2) return false;
  if (!mapHasSize(map)) return false;
  try {
    map.fitBounds(valid, { padding: options?.padding ?? [48, 48], maxZoom: options?.maxZoom ?? 14 });
    return true;
  } catch {
    return false;
  }
}
