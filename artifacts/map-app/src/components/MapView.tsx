import React, { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapElement, MapMarker, MapShape } from "@/lib/db";
import { generateId } from "@/lib/geo";
import { Tool } from "./Toolbar";

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ICON_EMOJIS: Record<string, string> = {
  default: "📍",
  star: "⭐",
  home: "🏠",
  flag: "🚩",
  camera: "📷",
  food: "🍽️",
  car: "🚗",
  tree: "🌲",
};

function createMarkerIcon(color: string, iconType: string): L.DivIcon {
  const emoji = ICON_EMOJIS[iconType] || "📍";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      border:2px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      width:28px;height:28px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
    "><span style="transform:rotate(45deg);font-size:13px;line-height:1">${emoji}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

interface MapViewProps {
  elements: MapElement[];
  activeTool: Tool;
  mapLayer: "osm" | "satellite" | "topo";
  darkMode: boolean;
  onElementAdd: (element: MapElement) => void;
  onElementSelect: (element: MapElement | null) => void;
  selectedElementId: string | null;
  measurePoints: [number, number][];
  onMeasurePoint: (lat: number, lng: number) => void;
  searchLocation: { lat: number; lng: number } | null;
  onSearchLocationConsumed: () => void;
}

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SAT_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SAT_ATTRIBUTION = "Tiles &copy; Esri";
const TOPO_URL = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
const TOPO_ATTRIBUTION = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

export default function MapView({
  elements,
  activeTool,
  mapLayer,
  darkMode,
  onElementAdd,
  onElementSelect,
  selectedElementId,
  measurePoints,
  onMeasurePoint,
  searchLocation,
  onSearchLocationConsumed,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersRef = useRef<Map<string, L.Layer>>(new Map());
  const measureLayerRef = useRef<L.FeatureGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // For polygon drawing
  const polygonPointsRef = useRef<[number, number][]>([]);
  const drawLayerRef = useRef<L.FeatureGroup | null>(null);
  const previewLayerRef = useRef<L.Polyline | L.Polygon | null>(null);

  // For rectangle / circle drawing (drag)
  const dragStartRef = useRef<L.LatLng | null>(null);
  const isDraggingRef = useRef(false);
  const dragShapeRef = useRef<L.Rectangle | L.Circle | null>(null);

  // ---------- Init map ----------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tileLayer = L.tileLayer(OSM_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const measureLayer = new L.FeatureGroup().addTo(map);
    const drawLayer = new L.FeatureGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tileLayer;
    measureLayerRef.current = measureLayer;
    drawLayerRef.current = drawLayer;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---------- Layer toggle ----------
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const map = mapRef.current;
    map.removeLayer(tileLayerRef.current);
    let url = OSM_URL, attribution = OSM_ATTRIBUTION;
    if (mapLayer === "satellite") { url = SAT_URL; attribution = SAT_ATTRIBUTION; }
    else if (mapLayer === "topo") { url = TOPO_URL; attribution = TOPO_ATTRIBUTION; }
    tileLayerRef.current = L.tileLayer(url, { attribution, maxZoom: 17 }).addTo(map);
  }, [mapLayer]);

  // ---------- Dark mode ----------
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.filter = darkMode
      ? "invert(90%) hue-rotate(180deg)"
      : "";
  }, [darkMode]);

  // ---------- Search location flyTo ----------
  useEffect(() => {
    if (!mapRef.current || !searchLocation) return;
    const map = mapRef.current;

    // Clear previous search marker and timer
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }

    // Blue classic pushpin for search results
    const searchIcon = L.divIcon({
      className: "",
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
        <ellipse cx="14" cy="36" rx="5" ry="2" fill="rgba(0,0,0,0.18)"/>
        <path d="M14 2C8.477 2 4 6.477 4 12c0 7.5 10 24 10 24s10-16.5 10-24c0-5.523-4.477-10-10-10z"
          fill="#2563eb" stroke="white" stroke-width="1.5"/>
        <circle cx="14" cy="12" r="4.5" fill="white" opacity="0.9"/>
      </svg>`,
      iconSize: [28, 38],
      iconAnchor: [14, 38],
      popupAnchor: [0, -40],
    });

    searchMarkerRef.current = L.marker([searchLocation.lat, searchLocation.lng], { icon: searchIcon })
      .addTo(map);

    map.flyTo([searchLocation.lat, searchLocation.lng], 15, { animate: true, duration: 1.2 });

    // Auto-remove marker after 8 seconds
    searchTimerRef.current = setTimeout(() => {
      if (searchMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(searchMarkerRef.current);
        searchMarkerRef.current = null;
      }
    }, 8000);

    onSearchLocationConsumed();
  }, [searchLocation, onSearchLocationConsumed]);

  // ---------- Render elements ----------
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentIds = new Set(elements.map((e) => e.id));

    // Remove stale layers
    for (const [id, layer] of Array.from(layersRef.current.entries())) {
      if (!currentIds.has(id)) {
        map.removeLayer(layer);
        layersRef.current.delete(id);
      }
    }

    for (const el of elements) {
      if (el.type === "marker") {
        const m = el as MapMarker;
        const icon = createMarkerIcon(m.color, m.iconType);
        const existing = layersRef.current.get(el.id) as L.Marker | undefined;
        if (existing) {
          existing.setIcon(icon);
        } else {
          const marker = L.marker([m.lat, m.lng], { icon });
          marker.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            onElementSelect(m);
          });
          marker.addTo(map);
          layersRef.current.set(el.id, marker);
        }
      } else {
        const s = el as MapShape;
        const styleOpts = {
          color: s.color,
          fillColor: s.fillColor || s.color,
          fillOpacity: s.opacity,
          weight: selectedElementId === s.id ? 3 : 2,
          opacity: 1,
        };
        const existing = layersRef.current.get(el.id) as L.Path | undefined;
        if (existing) {
          existing.setStyle(styleOpts);
        } else {
          let layer: L.Layer;
          if (s.type === "circle" && s.center && s.radius != null) {
            layer = L.circle(s.center, { radius: s.radius, ...styleOpts });
          } else {
            layer = L.geoJSON(s.geojson as GeoJSON.Geometry, {
              style: () => styleOpts,
            });
          }
          layer.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            onElementSelect(s);
          });
          layer.addTo(map);
          layersRef.current.set(el.id, layer);
        }
      }
    }
  }, [elements, selectedElementId, onElementSelect]);

  // ---------- Drawing tools (custom, no leaflet-draw) ----------
  useEffect(() => {
    if (!mapRef.current || !drawLayerRef.current) return;
    const map = mapRef.current;
    const drawLayer = drawLayerRef.current;

    // Reset draw state
    polygonPointsRef.current = [];
    dragStartRef.current = null;
    isDraggingRef.current = false;
    if (previewLayerRef.current) {
      map.removeLayer(previewLayerRef.current);
      previewLayerRef.current = null;
    }
    if (dragShapeRef.current) {
      map.removeLayer(dragShapeRef.current);
      dragShapeRef.current = null;
    }
    drawLayer.clearLayers();

    // Remove all prior listeners
    map.off("click");
    map.off("dblclick");
    map.off("mousemove");
    map.off("mousedown");
    map.off("mouseup");

    const container = map.getContainer();

    if (activeTool === "select") {
      container.style.cursor = "";
      map.dragging.enable();
      return;
    }

    if (activeTool === "marker") {
      container.style.cursor = "crosshair";
      map.dragging.enable();
      map.on("click", (e: L.LeafletMouseEvent) => {
        const id = generateId();
        const el: MapMarker = {
          id,
          type: "marker",
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          title: "New Marker",
          description: "",
          tags: [],
          date: new Date().toISOString().slice(0, 10),
          color: "#3b82f6",
          iconType: "default",
          imageIds: [],
          createdAt: Date.now(),
        };
        onElementAdd(el);
        onElementSelect(el);
      });
      return;
    }

    if (activeTool === "measure") {
      container.style.cursor = "crosshair";
      map.dragging.enable();
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMeasurePoint(e.latlng.lat, e.latlng.lng);
      });
      return;
    }

    // --- Polygon (click-to-add-vertex, dblclick to close) ---
    if (activeTool === "polygon") {
      container.style.cursor = "crosshair";
      map.dragging.enable();

      map.on("click", (e: L.LeafletMouseEvent) => {
        polygonPointsRef.current = [...polygonPointsRef.current, [e.latlng.lat, e.latlng.lng]];
        const pts = polygonPointsRef.current;

        // Update preview
        if (previewLayerRef.current) map.removeLayer(previewLayerRef.current);
        if (pts.length === 1) {
          previewLayerRef.current = L.polyline(pts as L.LatLngTuple[], {
            color: "#3b82f6",
            dashArray: "6 4",
            weight: 2,
          }).addTo(map);
        } else {
          previewLayerRef.current = L.polygon(pts as L.LatLngTuple[], {
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.2,
            dashArray: "6 4",
            weight: 2,
          }).addTo(map);
        }
      });

      map.on("dblclick", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const pts = polygonPointsRef.current;
        if (pts.length < 3) return;

        if (previewLayerRef.current) { map.removeLayer(previewLayerRef.current); previewLayerRef.current = null; }
        polygonPointsRef.current = [];

        const geojson: GeoJSON.Geometry = {
          type: "Polygon",
          coordinates: [[...pts.map(([lat, lng]) => [lng, lat]), [pts[0][1], pts[0][0]]]],
        };
        const id = generateId();
        const el: MapShape = {
          id,
          type: "polygon",
          geojson,
          title: "New Polygon",
          description: "",
          tags: [],
          date: new Date().toISOString().slice(0, 10),
          color: "#3b82f6",
          fillColor: "#3b82f6",
          opacity: 0.3,
          imageIds: [],
          createdAt: Date.now(),
        };
        onElementAdd(el);
        onElementSelect(el);
      });
      return;
    }

    // --- Rectangle (mousedown → drag → mouseup) ---
    if (activeTool === "rectangle") {
      container.style.cursor = "crosshair";
      map.dragging.disable();

      map.on("mousedown", (e: L.LeafletMouseEvent) => {
        dragStartRef.current = e.latlng;
        isDraggingRef.current = true;
      });

      map.on("mousemove", (e: L.LeafletMouseEvent) => {
        if (!isDraggingRef.current || !dragStartRef.current) return;
        if (dragShapeRef.current) map.removeLayer(dragShapeRef.current);
        const bounds = L.latLngBounds(dragStartRef.current, e.latlng);
        dragShapeRef.current = L.rectangle(bounds, {
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
          dashArray: "6 4",
          weight: 2,
        }).addTo(map);
      });

      map.on("mouseup", (e: L.LeafletMouseEvent) => {
        if (!isDraggingRef.current || !dragStartRef.current) return;
        isDraggingRef.current = false;

        if (dragShapeRef.current) { map.removeLayer(dragShapeRef.current); dragShapeRef.current = null; }

        const start = dragStartRef.current;
        const end = e.latlng;
        dragStartRef.current = null;

        // Minimum drag distance
        if (Math.abs(start.lat - end.lat) < 0.0001 && Math.abs(start.lng - end.lng) < 0.0001) return;

        const bounds = L.latLngBounds(start, end);
        const geojson: GeoJSON.Geometry = {
          type: "Polygon",
          coordinates: [[
            [bounds.getWest(), bounds.getSouth()],
            [bounds.getEast(), bounds.getSouth()],
            [bounds.getEast(), bounds.getNorth()],
            [bounds.getWest(), bounds.getNorth()],
            [bounds.getWest(), bounds.getSouth()],
          ]],
        };
        const id = generateId();
        const el: MapShape = {
          id,
          type: "rectangle",
          geojson,
          title: "New Rectangle",
          description: "",
          tags: [],
          date: new Date().toISOString().slice(0, 10),
          color: "#3b82f6",
          fillColor: "#3b82f6",
          opacity: 0.3,
          imageIds: [],
          createdAt: Date.now(),
        };
        onElementAdd(el);
        onElementSelect(el);
      });
      return;
    }

    // --- Circle (mousedown → drag → mouseup) ---
    if (activeTool === "circle") {
      container.style.cursor = "crosshair";
      map.dragging.disable();

      map.on("mousedown", (e: L.LeafletMouseEvent) => {
        dragStartRef.current = e.latlng;
        isDraggingRef.current = true;
      });

      map.on("mousemove", (e: L.LeafletMouseEvent) => {
        if (!isDraggingRef.current || !dragStartRef.current) return;
        const radius = dragStartRef.current.distanceTo(e.latlng);
        if (dragShapeRef.current) map.removeLayer(dragShapeRef.current);
        dragShapeRef.current = L.circle(dragStartRef.current, {
          radius,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
          dashArray: "6 4",
          weight: 2,
        }).addTo(map);
      });

      map.on("mouseup", (e: L.LeafletMouseEvent) => {
        if (!isDraggingRef.current || !dragStartRef.current) return;
        isDraggingRef.current = false;

        if (dragShapeRef.current) { map.removeLayer(dragShapeRef.current); dragShapeRef.current = null; }

        const center = dragStartRef.current;
        const radius = center.distanceTo(e.latlng);
        dragStartRef.current = null;

        if (radius < 10) return;

        const geojson: GeoJSON.Geometry = { type: "Point", coordinates: [center.lng, center.lat] };
        const id = generateId();
        const el: MapShape = {
          id,
          type: "circle",
          geojson,
          center: [center.lat, center.lng],
          radius,
          title: "New Circle",
          description: "",
          tags: [],
          date: new Date().toISOString().slice(0, 10),
          color: "#3b82f6",
          fillColor: "#3b82f6",
          opacity: 0.3,
          imageIds: [],
          createdAt: Date.now(),
        };
        onElementAdd(el);
        onElementSelect(el);
      });
      return;
    }

  }, [activeTool, onElementAdd, onElementSelect, onMeasurePoint]);

  // ---------- Measure line ----------
  useEffect(() => {
    if (!mapRef.current || !measureLayerRef.current) return;
    const measureLayer = measureLayerRef.current;
    measureLayer.clearLayers();
    if (measurePoints.length > 1) {
      L.polyline(measurePoints, { color: "#f97316", dashArray: "6,4", weight: 2 }).addTo(measureLayer);
    }
    for (const pt of measurePoints) {
      L.circleMarker(pt, { radius: 5, color: "#f97316", fillColor: "#f97316", fillOpacity: 1 }).addTo(measureLayer);
    }
  }, [measurePoints]);

  return <div ref={containerRef} className="map-container" />;
}
