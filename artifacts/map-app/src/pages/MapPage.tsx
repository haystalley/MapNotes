import React, { useState, useEffect, useCallback, useRef } from "react";
import MapView from "@/components/MapView";
import Toolbar, { Tool, MapMode, SearchResult } from "@/components/Toolbar";
import ElementPopup from "@/components/ElementPopup";
import MeasurePanel from "@/components/MeasurePanel";
import { useMapData } from "@/hooks/useMapData";
import { MapElement } from "@/lib/db";
import { saveSetting, getSetting } from "@/lib/db";

export default function MapPage() {
  const { elements, loading, addElement, updateElement, removeElement, clearAll, exportGeoJSON, importGeoJSON } = useMapData();
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [mapMode, setMapMode] = useState<MapMode>("osm");
  const [selectedElement, setSelectedElement] = useState<MapElement | null>(null);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [history, setHistory] = useState<MapElement[][]>([]);
  const [future, setFuture] = useState<MapElement[][]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Load saved map mode
  useEffect(() => {
    getSetting<MapMode>("mapMode").then((v) => {
      if (v) setMapMode(v);
    });
  }, []);

  const handleMapModeChange = useCallback((mode: MapMode) => {
    setMapMode(mode);
    saveSetting("mapMode", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Apply dark class on mount if mode is dark
  useEffect(() => {
    if (mapMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mapMode]);

  // Undo / Redo support
  const handleElementAdd = useCallback(
    async (el: MapElement) => {
      setHistory((h) => [...h.slice(-30), [...elements]]);
      setFuture([]);
      setCanUndo(true);
      setCanRedo(false);
      await addElement(el);
    },
    [elements, addElement]
  );

  const handleElementUpdate = useCallback(
    async (el: MapElement) => {
      await updateElement(el);
      if (selectedElement?.id === el.id) setSelectedElement(el);
    },
    [updateElement, selectedElement]
  );

  const handleElementDelete = useCallback(
    async (id: string) => {
      setHistory((h) => [...h.slice(-30), [...elements]]);
      setFuture([]);
      setCanUndo(true);
      setCanRedo(false);
      await removeElement(id);
      setSelectedElement(null);
    },
    [elements, removeElement]
  );

  const handleUndo = useCallback(async () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture((f) => [[...elements], ...f.slice(0, 29)]);
    setHistory((h) => h.slice(0, -1));
    setCanUndo(history.length > 1);
    setCanRedo(true);
    await clearAll();
    for (const el of prev) await addElement(el);
  }, [history, elements, clearAll, addElement]);

  const handleRedo = useCallback(async () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h.slice(-29), [...elements]]);
    setFuture((f) => f.slice(1));
    setCanUndo(true);
    setCanRedo(future.length > 1);
    await clearAll();
    for (const el of next) await addElement(el);
  }, [future, elements, clearAll, addElement]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "s" || e.key === "S") setActiveTool("select");
      if (e.key === "m" || e.key === "M") setActiveTool("marker");
      if (e.key === "p" || e.key === "P") setActiveTool("polygon");
      if (e.key === "r" || e.key === "R") setActiveTool("rectangle");
      if (e.key === "c" || e.key === "C") setActiveTool("circle");
      if (e.key === "e" || e.key === "E") setActiveTool("measure");
      if (e.key === "Escape") {
        setActiveTool("select");
        setSelectedElement(null);
        setSearchResults([]);
        setSearchError(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleUndo, handleRedo]);

  // --- Address Search ---
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        { headers: { "Accept-Language": "en", "User-Agent": "MapNotes/1.0" } }
      );
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setSearchError("Address not found. Try a more specific search.");
        return;
      }

      if (data.length === 1) {
        // Single result — zoom immediately
        const r = data[0];
        const loc = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
        setSearchLocation(loc);
        setSearchQuery("");
      } else {
        // Multiple results — show dropdown
        setSearchResults(
          data.map((r: { lat: string; lon: string; display_name: string }) => ({
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            name: r.display_name,
          }))
        );
      }
    } catch {
      setSearchError("Search failed. Check your connection and try again.");
    }
  }, [searchQuery]);

  const handleResultSelect = useCallback((result: SearchResult) => {
    setSearchLocation({ lat: result.lat, lng: result.lng });
    setSearchResults([]);
    setSearchError(null);
    setSearchQuery("");
  }, []);

  const handleResultsDismiss = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const handleClearAll = useCallback(async () => {
    setHistory((h) => [...h.slice(-30), [...elements]]);
    setFuture([]);
    setCanUndo(true);
    setCanRedo(false);
    await clearAll();
    setSelectedElement(null);
  }, [elements, clearAll]);

  const handleImport = useCallback(
    (file: File) => {
      importGeoJSON(file).catch((err) => alert(`Import failed: ${err.message}`));
    },
    [importGeoJSON]
  );

  const handleMeasurePoint = useCallback((lat: number, lng: number) => {
    setMeasurePoints((pts) => [...pts, [lat, lng]]);
  }, []);

  const handleMeasureClear = useCallback(() => setMeasurePoints([]), []);

  useEffect(() => {
    if (activeTool !== "measure") setMeasurePoints([]);
  }, [activeTool]);

  const isDark = mapMode === "dark";
  const mapLayer = mapMode === "satellite" ? "satellite" : "osm";

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div className={`app-root ${isDark ? "dark" : ""}`}>
      <Toolbar
        activeTool={activeTool}
        onToolChange={(tool) => {
          setActiveTool(tool);
          if (tool !== "select") setSelectedElement(null);
        }}
        mapMode={mapMode}
        onMapModeChange={handleMapModeChange}
        onExport={exportGeoJSON}
        onImport={() => importInputRef.current?.click()}
        onClearAll={handleClearAll}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (!q) { setSearchResults([]); setSearchError(null); }
        }}
        onSearchSubmit={handleSearch}
        searchResults={searchResults}
        searchError={searchError}
        onResultSelect={handleResultSelect}
        onResultsDismiss={handleResultsDismiss}
        elementCount={elements.length}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".geojson,.json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleImport(e.target.files[0]);
          e.target.value = "";
        }}
      />

      <div className="map-wrapper" onClick={handleResultsDismiss}>
        <MapView
          elements={elements}
          activeTool={activeTool}
          mapLayer={mapLayer}
          darkMode={isDark}
          onElementAdd={handleElementAdd}
          onElementSelect={setSelectedElement}
          selectedElementId={selectedElement?.id || null}
          measurePoints={measurePoints}
          onMeasurePoint={handleMeasurePoint}
          searchLocation={searchLocation}
          onSearchLocationConsumed={() => setSearchLocation(null)}
        />

        {selectedElement && (
          <div className="popup-overlay">
            <ElementPopup
              element={selectedElement}
              onUpdate={handleElementUpdate}
              onDelete={handleElementDelete}
              onClose={() => setSelectedElement(null)}
            />
          </div>
        )}

        {activeTool === "measure" && (
          <div className="measure-overlay">
            <MeasurePanel points={measurePoints} onClear={handleMeasureClear} />
          </div>
        )}

        {activeTool !== "select" && (
          <div className="tool-hint">
            {activeTool === "marker" && "Click on the map to place a marker"}
            {activeTool === "polygon" && "Click to draw polygon vertices, double-click to finish"}
            {activeTool === "rectangle" && "Click and drag to draw a rectangle"}
            {activeTool === "circle" && "Click and drag to draw a circle"}
            {activeTool === "measure" && "Click to add measurement points · Press E or Esc to stop"}
          </div>
        )}
      </div>
    </div>
  );
}
