export type LayerId = "street" | "satellite" | "topo" | "hillshade" | "contour";

export interface ActiveLayer {
  id: LayerId;
  opacity: number;
  activatedAt: number;
}

export const LAYER_LABELS: Record<LayerId, string> = {
  street:    "Street Map",
  satellite: "Satellite",
  topo:      "Topographic",
  hillshade: "Hillshade / Terrain",
  contour:   "Contour Lines",
};

export const LAYER_DESCRIPTIONS: Record<LayerId, string> = {
  street:    "Default street map with roads and labels",
  satellite: "Aerial / satellite imagery",
  topo:      "Topographic with roads, labels and contours",
  hillshade: "Clean terrain relief — no roads or labels",
  contour:   "Elevation contour overlay — use on any base",
};

export const LAYER_IS_OVERLAY: Record<LayerId, boolean> = {
  street:    false,
  satellite: false,
  topo:      false,
  hillshade: false,
  contour:   true,
};

export const CYCLE_LAYERS: LayerId[] = ["street", "satellite", "topo", "hillshade"];
