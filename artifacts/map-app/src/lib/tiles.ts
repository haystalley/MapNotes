import { LayerId } from "@/types";

export interface TileConfig {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TOPO_ATTR = `Map data: ${OSM_ATTR}, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)`;

export const TILE_CONFIGS: Record<LayerId | "streetDark", TileConfig> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: OSM_ATTR,
    maxZoom: 19,
  },
  streetDark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    maxZoom: 19,
    subdomains: "abcd",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP and the GIS User Community",
    maxZoom: 19,
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: TOPO_ATTR,
    maxZoom: 17,
  },
  hillshade: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, USGS, NGA, NASA, CGIAR, N Robinson, NCEAS, NLS, OS, NMA, Geodatastyrelsen, Rijkswaterstaat, GSA, Geoland, FGDC, HereNL and the GIS User Community",
    maxZoom: 13,
  },
  contour: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: TOPO_ATTR,
    maxZoom: 17,
  },
};

export const DEFAULT_CONTOUR_OPACITY = 0.45;
