'use client';

import { TileLayer } from 'react-leaflet';

/** Esri canvas tiles. CARTO's free CDN stamps "API KEY REQUIRED" across the map. */
const TILES = {
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  darkLabels:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  light:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  lightLabels:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri',
} as const;

export function MapBasemap({ light = false }: { light?: boolean }) {
  return (
    <>
      <TileLayer
        attribution={TILES.attribution}
        url={light ? TILES.light : TILES.dark}
        maxZoom={19}
        maxNativeZoom={16}
      />
      <TileLayer
        url={light ? TILES.lightLabels : TILES.darkLabels}
        maxZoom={19}
        maxNativeZoom={16}
      />
    </>
  );
}
