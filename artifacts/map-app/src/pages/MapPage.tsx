import React, { useState, useEffect, useCallback, useRef } from "react";
import MapView from "@/components/MapView";
import Toolbar, { Tool, SearchResult } from "@/components/Toolbar";
import ElementPopup from "@/components/ElementPopup";
import MeasurePanel from "@/components/MeasurePanel";
import ProjectsPanel from "@/components/ProjectsPanel";
import LayersPanel from "@/components/LayersPanel";
import { useMapData } from "@/hooks/useMapData";
import { MapElement } from "@/lib/db";
import {
  saveSetting, getSetting,
  getAllImages, saveImage,
  saveProject, deleteProject,
  clearAllElements, saveElement,
  ProjectEntry,
} from "@/lib/db";
import { generateThumbnail } from "@/lib/thumbnail";
import { LayerId, ActiveLayer, CYCLE_LAYERS } from "@/types";
import { DEFAULT_CONTOUR_OPACITY } from "@/lib/tiles";

const VISITOR_KEY = "mapnotes_visitor_initialized";

function makeLayer(id: LayerId, opacity?: number): ActiveLayer {
  return { id, opacity: opacity ?? (id === "contour" ? DEFAULT_CONTOUR_OPACITY : 1), activatedAt: Date.now() };
}

export default function MapPage() {
  const { elements, loading, addElement, updateElement, removeElement, clearAll, exportGeoJSON, importGeoJSON, setElements } = useMapData();
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [darkMode, setDarkMode] = useState(false);
  const [activeLayers, setActiveLayers] = useState<ActiveLayer[]>([makeLayer("street")]);
  const [cycleIdx, setCycleIdx] = useState(0);
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

  const [projectsOpen, setProjectsOpen] = useState(false);
  const projectsBtnRef = useRef<HTMLButtonElement>(null);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const layersPanelBtnRef = useRef<HTMLButtonElement>(null);

  // ---- Session / first-visit detection ----
  useEffect(() => {
    if (!localStorage.getItem(VISITOR_KEY)) {
      localStorage.setItem(VISITOR_KEY, "1");
    }
  }, []);

  // Load saved settings
  useEffect(() => {
    getSetting<boolean>("darkMode").then((v) => {
      if (v != null) setDarkMode(v);
    });
    getSetting<ActiveLayer[]>("activeLayers").then((v) => {
      if (Array.isArray(v) && v.length > 0) setActiveLayers(v);
    });
    getSetting<number>("cycleIdx").then((v) => {
      if (v != null) setCycleIdx(v);
    });
  }, []);

  // Persist settings
  const persistSettings = useCallback((dm: boolean, al: ActiveLayer[], ci: number) => {
    saveSetting("darkMode", dm);
    saveSetting("activeLayers", al);
    saveSetting("cycleIdx", ci);
  }, []);

  // ---- Dark mode ----
  const handleDarkModeToggle = useCallback(() => {
    setDarkMode((d) => {
      const next = !d;
      persistSettings(next, activeLayers, cycleIdx);
      return next;
    });
  }, [activeLayers, cycleIdx, persistSettings]);

  // ---- Layer cycle button ----
  const handleCycleLayer = useCallback(() => {
    const nextIdx = (cycleIdx + 1) % CYCLE_LAYERS.length;
    const nextId = CYCLE_LAYERS[nextIdx];
    const newLayers = [makeLayer(nextId)];
    setCycleIdx(nextIdx);
    setActiveLayers(newLayers);
    persistSettings(darkMode, newLayers, nextIdx);
  }, [cycleIdx, darkMode, persistSettings]);

  // ---- Layers panel: toggle layer ----
  const handleToggleLayer = useCallback((id: LayerId) => {
    setActiveLayers((prev) => {
      const existing = prev.find((l) => l.id === id);
      let next: ActiveLayer[];
      if (existing) {
        next = prev.filter((l) => l.id !== id);
        if (next.length === 0) next = [makeLayer("street")];
      } else {
        if (prev.length >= 2) {
          const oldest = [...prev].sort((a, b) => a.activatedAt - b.activatedAt)[0];
          next = [...prev.filter((l) => l.id !== oldest.id), makeLayer(id)];
        } else {
          next = [...prev, makeLayer(id)];
        }
      }
      persistSettings(darkMode, next, cycleIdx);
      return next;
    });
  }, [darkMode, cycleIdx, persistSettings]);

  // ---- Layers panel: opacity change ----
  const handleOpacityChange = useCallback((id: LayerId, opacity: number) => {
    setActiveLayers((prev) => {
      const next = prev.map((l) => l.id === id ? { ...l, opacity } : l);
      persistSettings(darkMode, next, cycleIdx);
      return next;
    });
  }, [darkMode, cycleIdx, persistSettings]);

  // ---- Layers panel: blend mode toggle ----
  const handleBlendModeToggle = useCallback((id: LayerId) => {
    setActiveLayers((prev) => {
      const next = prev.map((l) =>
        l.id === id
          ? { ...l, blendMode: l.blendMode === "multiply" ? ("normal" as const) : ("multiply" as const) }
          : l
      );
      persistSettings(darkMode, next, cycleIdx);
      return next;
    });
  }, [darkMode, cycleIdx, persistSettings]);

  // Undo / Redo
  const handleElementAdd = useCallback(async (el: MapElement) => {
    setHistory((h) => [...h.slice(-30), [...elements]]);
    setFuture([]);
    setCanUndo(true);
    setCanRedo(false);
    await addElement(el);
  }, [elements, addElement]);

  const handleElementUpdate = useCallback(async (el: MapElement) => {
    await updateElement(el);
    if (selectedElement?.id === el.id) setSelectedElement(el);
  }, [updateElement, selectedElement]);

  const handleElementDelete = useCallback(async (id: string) => {
    setHistory((h) => [...h.slice(-30), [...elements]]);
    setFuture([]);
    setCanUndo(true);
    setCanRedo(false);
    await removeElement(id);
    setSelectedElement(null);
  }, [elements, removeElement]);

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
        setProjectsOpen(false);
        setLayersPanelOpen(false);
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
        const r = data[0];
        setSearchLocation({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
        setSearchQuery("");
      } else {
        setSearchResults(
          data.map((r: { lat: string; lon: string; display_name: string }) => ({
            lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.display_name,
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

  const handleImport = useCallback((file: File) => {
    importGeoJSON(file).catch((err) => alert(`Import failed: ${err.message}`));
  }, [importGeoJSON]);

  const handleMeasurePoint = useCallback((lat: number, lng: number) => {
    setMeasurePoints((pts) => [...pts, [lat, lng]]);
  }, []);

  const handleMeasureClear = useCallback(() => setMeasurePoints([]), []);

  useEffect(() => {
    if (activeTool !== "measure") setMeasurePoints([]);
  }, [activeTool]);

  // ---- Project Management ----
  const handleSaveProject = useCallback(async (name: string) => {
    const images = await getAllImages();
    const elementImageIds = new Set(elements.flatMap((el) => el.imageIds));
    const relevantImages = images.filter((img) => elementImageIds.has(img.id));
    const thumbnail = generateThumbnail(elements);
    const project: ProjectEntry = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activeLayers,
      darkMode,
      elements: [...elements],
      images: relevantImages,
      thumbnail,
    };
    await saveProject(project);
  }, [elements, activeLayers, darkMode]);

  const handleLoadProject = useCallback(async (project: ProjectEntry) => {
    await clearAllElements();
    for (const el of project.elements) await saveElement(el);
    for (const img of project.images) await saveImage(img);
    setElements(project.elements);
    if (project.activeLayers && project.activeLayers.length > 0) {
      const al = project.activeLayers as ActiveLayer[];
      setActiveLayers(al);
      const cycleId = al.find((l) => l.id !== "contour")?.id as LayerId | undefined;
      const ci = cycleId ? CYCLE_LAYERS.indexOf(cycleId) : 0;
      setCycleIdx(ci >= 0 ? ci : 0);
    } else if (project.mapMode) {
      const id = project.mapMode === "satellite" ? "satellite" : project.mapMode === "topo" ? "topo" : "street";
      setActiveLayers([makeLayer(id as LayerId)]);
    }
    if (project.darkMode != null) setDarkMode(project.darkMode);
    setSelectedElement(null);
    setHistory([]); setFuture([]);
    setCanUndo(false); setCanRedo(false);
  }, [setElements]);

  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading map...</p>
      </div>
    );
  }

  const cycleLayer = CYCLE_LAYERS[cycleIdx];

  return (
    <div className={`app-root ${darkMode ? "dark" : ""}`}>
      <div style={{ position: "relative" }}>
        <Toolbar
          activeTool={activeTool}
          onToolChange={(tool) => {
            setActiveTool(tool);
            if (tool !== "select") setSelectedElement(null);
          }}
          darkMode={darkMode}
          onDarkModeToggle={handleDarkModeToggle}
          cycleLayer={cycleLayer}
          onCycleLayer={handleCycleLayer}
          onLayersPanelToggle={() => setLayersPanelOpen((v) => !v)}
          layersPanelBtnRef={layersPanelBtnRef}
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
          onProjectsToggle={() => setProjectsOpen((v) => !v)}
          projectsBtnRef={projectsBtnRef}
          activeLayers={activeLayers}
        />

        <ProjectsPanel
          open={projectsOpen}
          onClose={() => setProjectsOpen(false)}
          onSave={handleSaveProject}
          onLoad={handleLoadProject}
          onDelete={handleDeleteProject}
          triggerRef={projectsBtnRef}
        />

        <LayersPanel
          open={layersPanelOpen}
          onClose={() => setLayersPanelOpen(false)}
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
          onOpacityChange={handleOpacityChange}
          onBlendModeToggle={handleBlendModeToggle}
          triggerRef={layersPanelBtnRef}
        />
      </div>

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
          activeLayers={activeLayers}
          darkMode={darkMode}
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
            {activeTool === "polygon" && "Click to add vertices · Double-click to finish polygon"}
            {activeTool === "rectangle" && "Click and drag to draw a rectangle"}
            {activeTool === "circle" && "Click and drag to draw a circle"}
            {activeTool === "measure" && "Click to add measurement points · Press E or Esc to stop"}
          </div>
        )}
      </div>
    </div>
  );
}
