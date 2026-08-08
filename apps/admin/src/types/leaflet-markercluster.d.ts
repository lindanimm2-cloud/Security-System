import 'leaflet';

declare module 'leaflet' {
  interface MarkerClusterGroupOptions {
    showCoverageOnHover?: boolean;
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
    disableClusteringAtZoom?: number;
    chunkedLoading?: boolean;
  }

  class MarkerClusterGroup extends FeatureGroup {
    constructor(options?: MarkerClusterGroupOptions);
    clearLayers(): this;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}

declare module 'leaflet.markercluster' {}
