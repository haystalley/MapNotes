import { useState, useEffect, useCallback } from "react";
import {
  MapElement,
  getAllElements,
  saveElement,
  deleteElement,
  clearAllElements,
} from "@/lib/db";
import { elementsToGeoJSON, downloadJSON } from "@/lib/geo";

export function useMapData() {
  const [elements, setElements] = useState<MapElement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllElements().then((els) => {
      setElements(els);
      setLoading(false);
    });
  }, []);

  const replaceElements = useCallback((els: MapElement[]) => {
    setElements(els);
  }, []);

  const addElement = useCallback(async (element: MapElement) => {
    await saveElement(element);
    setElements((prev) => [...prev, element]);
  }, []);

  const updateElement = useCallback(async (element: MapElement) => {
    await saveElement(element);
    setElements((prev) =>
      prev.map((el) => (el.id === element.id ? element : el))
    );
  }, []);

  const removeElement = useCallback(async (id: string) => {
    await deleteElement(id);
    setElements((prev) => prev.filter((el) => el.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await clearAllElements();
    setElements([]);
  }, []);

  const exportGeoJSON = useCallback(() => {
    const geojson = elementsToGeoJSON(elements);
    downloadJSON(geojson, `map-export-${Date.now()}.geojson`);
  }, [elements]);

  const importGeoJSON = useCallback(
    async (file: File) => {
      const text = await file.text();
      const geojson = JSON.parse(text);
      if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
        throw new Error("Invalid GeoJSON FeatureCollection");
      }
      for (const feature of geojson.features) {
        const props = feature.properties || {};
        if (feature.geometry?.type === "Point") {
          const el: MapElement = {
            id: props.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: "marker",
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            title: props.title || "Imported Marker",
            description: props.description || "",
            tags: props.tags || [],
            date: props.date || new Date().toISOString().slice(0, 10),
            color: props.color || "#3b82f6",
            iconType: props.iconType || "default",
            imageIds: [],
            createdAt: props.createdAt || Date.now(),
          };
          await saveElement(el);
          setElements((prev) => [...prev, el]);
        } else if (feature.geometry) {
          const el: MapElement = {
            id: props.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: props.type || "polygon",
            geojson: feature.geometry,
            center: props.center,
            radius: props.radius,
            title: props.title || "Imported Shape",
            description: props.description || "",
            tags: props.tags || [],
            date: props.date || new Date().toISOString().slice(0, 10),
            color: props.color || "#3b82f6",
            fillColor: props.fillColor || "#3b82f6",
            opacity: props.opacity ?? 0.3,
            imageIds: [],
            createdAt: props.createdAt || Date.now(),
          };
          await saveElement(el);
          setElements((prev) => [...prev, el]);
        }
      }
    },
    []
  );

  return {
    elements,
    loading,
    addElement,
    updateElement,
    removeElement,
    clearAll,
    exportGeoJSON,
    importGeoJSON,
    setElements: replaceElements,
  };
}
