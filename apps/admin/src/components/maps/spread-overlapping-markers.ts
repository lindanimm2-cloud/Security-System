export function overlapGroupKey(lat: number, lng: number) {
  return `${lat.toFixed(4)}:${lng.toFixed(4)}`;
}

export function spreadOverlappingMarkers(
  items: { id: string; lat: number; lng: number }[],
  spacingMeters = 18,
): Map<string, { lat: number; lng: number }> {
  const groups = new Map<string, { id: string; lat: number; lng: number }[]>();

  for (const item of items) {
    const key = overlapGroupKey(item.lat, item.lng);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const result = new Map<string, { lat: number; lng: number }>();

  for (const group of groups.values()) {
    if (group.length === 1) {
      const item = group[0];
      result.set(item.id, { lat: item.lat, lng: item.lng });
      continue;
    }

    const centerLat = group.reduce((sum, item) => sum + item.lat, 0) / group.length;
    const centerLng = group.reduce((sum, item) => sum + item.lng, 0) / group.length;
    const latRad = (centerLat * Math.PI) / 180;
    const metersPerDegreeLat = 111_320;
    const metersPerDegreeLng = 111_320 * Math.cos(latRad);
    const radius =
      spacingMeters * (group.length <= 4 ? 1 : 1 + (group.length - 4) * 0.12);

    group.forEach((item, index) => {
      const angle = (2 * Math.PI * index) / group.length - Math.PI / 2;
      result.set(item.id, {
        lat: centerLat + (radius * Math.cos(angle)) / metersPerDegreeLat,
        lng: centerLng + (radius * Math.sin(angle)) / metersPerDegreeLng,
      });
    });
  }

  return result;
}
