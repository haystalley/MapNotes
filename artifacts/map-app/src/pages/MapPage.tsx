import React, { useState, useEffect, useCallback, useRef } from "react";
import MapView from "@/components/MapView";
import Toolbar, { Tool } from "@/components/Toolbar";
import ElementPopup from "@/components/ElementPopup";
import MeasurePanel from "@/components/MeasurePanel";
import { useMapData } from "@/hooks/useMapData";
import { MapElement } from "@/lib/db";
import { saveSetting, getSetting } from "@/lib/db";

export default function MapPage() {
  const { elements, loading, addElement, updateElement, removeElement, clearAll, exportGeoJSON, importGeoJSON } = useMapData();
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [mapLayer, setMapLayer] = useState<"osm" | "satellite">("osm");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<MapElement | null>(null);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [history, setHistory] = useState<MapElement[][]>([]);
  const [future, setFuture] = useState<MapElement[][]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Load dark mode preference
  useEffect(() => {
    getSetting<boolean>("darkMode").then((v) => {
      if (v !== undefined) setDarkMode(v);
    });
  }, []);

  const handleDarkModeToggle = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    saveSetting("darkMode", next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Apply dark mode to HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

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
    // Sync DB
    await clearAll();
    for (const el of prev) {
      await addElement(el);
    }
  }, [history, elements, clearAll, addElement]);

  const handleRedo = useCallback(async () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h.slice(-29), [...elements]]);
    setFuture((f) => f.slice(1));
    setCanUndo(true);
    setCanRedo(future.length > 1);
    await clearAll();
    for (const el of next) {
      await addElement(el);
    }
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
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleUndo, handleRedo]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data[0]) {
        setSearchResult({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name,
        });
      }
    } catch (err) {
      console.error("Search failed", err);
    }
  }, [searchQuery]);

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

  const handleMeasureClear = useCallback(() => {
    setMeasurePoints([]);
  }, []);

  // Clear measure points when tool changes
  useEffect(() => {
    if (activeTool !== "measure") {
      setMeasurePoints([]);
    }
  }, [activeTool]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div className={`app-root ${darkMode ? "dark" : ""}`}>
      <Toolbar
        activeTool={activeTool}
        onToolChange={(tool) => {
          setActiveTool(tool);
          if (tool !== "select") setSelectedElement(null);
        }}
        mapLayer={mapLayer}
        onLayerToggle={() => setMapLayer((l) => (l === "osm" ? "satellite" : "osm"))}
        darkMode={darkMode}
        onDarkModeToggle={handleDarkModeToggle}
        onExport={exportGeoJSON}
        onImport={() => importInputRef.current?.click()}
        onClearAll={handleClearAll}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
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

      <div className="map-wrapper">
        <MapView
          elements={elements}
          activeTool={activeTool}
          mapLayer={mapLayer}
          darkMode={darkMode}
          onElementAdd={handleElementAdd}
          onElementSelect={setSelectedElement}
          selectedElementId={selectedElement?.id || null}
          measurePoints={measurePoints}
          onMeasurePoint={handleMeasurePoint}
        />

        {/* Selected element popup */}
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

        {/* Measure panel */}
        {activeTool === "measure" && (
          <div className="measure-overlay">
            <MeasurePanel
              points={measurePoints}
              onClear={handleMeasureClear}
            />
          </div>
        )}

        {/* Tool hint */}
        {activeTool !== "select" && (
          <div className="tool-hint">
            {activeTool === "marker" && "Click on the map to place a marker"}
            {activeTool === "polygon" && "Click to draw polygon vertices, double-click to finish"}
            {activeTool === "rectangle" && "Click and drag to draw a rectangle"}
            {activeTool === "circle" && "Click and drag to draw a circle"}
            {activeTool === "measure" && "Click to add measurement points · Press E or Esc to stop"}
          </div>
        )}

        {/* Search result notification */}
        {searchResult && (
          <div className="search-result">
            <span>📍 Navigating to: {searchResult.name.split(",")[0]}</span>
            <button onClick={() => setSearchResult(null)}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
