export type LayerId = "street" | "satellite" | "topo" | "hillshade" | "contour";

export interface ActiveLayer {
  id: LayerId;
  opacity: number;
  activatedAt: number;
  blendMode?: "normal" | "multiply";
}

export const LAYER_LABELS: Record<LayerId, string> = {
  street:    "Street Map",
  satellite: "Satellite",
  topo:      "Topographic",
  hillshade: "Hillshade / Terrain",
  contour:   "ESRI Topo",
};

export const LAYER_DESCRIPTIONS: Record<LayerId, string> = {
  street:    "Default street map with roads and labels",
  satellite: "Aerial / satellite imagery",
  topo:      "OpenTopoMap — hiking-focused with elevation contours",
  hillshade: "ESRI terrain relief — no roads or labels",
  contour:   "ESRI USGS-style topo with clean contour lines and muted relief",
};

export const LAYER_IS_OVERLAY: Record<LayerId, boolean> = {
  street:    false,
  satellite: false,
  topo:      false,
  hillshade: false,
  contour:   false,
};

export const LAYER_SUPPORTS_BLEND: Record<LayerId, boolean> = {
  street:    false,
  satellite: false,
  topo:      false,
  hillshade: true,
  contour:   false,
};

export const CYCLE_LAYERS: LayerId[] = ["street", "satellite", "topo", "hillshade"];
