import React, { useRef } from "react";
import {
  MapPin, Pentagon, Square, Circle, MousePointer,
  Search, Upload, FolderOpen, Trash2,
  Undo2, Redo2, Ruler, Layers
} from "lucide-react";

export type Tool =
  | "select"
  | "marker"
  | "polygon"
  | "rectangle"
  | "circle"
  | "measure";

export type MapMode = "osm" | "satellite" | "topo" | "dark";

export type SearchResult = {
  lat: number;
  lng: number;
  name: string;
};

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  onExport: () => void;
  onImport: () => void;
  onClearAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  searchResults: SearchResult[];
  searchError: string | null;
  onResultSelect: (result: SearchResult) => void;
  onResultsDismiss: () => void;
  elementCount: number;
  onProjectsToggle: () => void;
  projectsBtnRef: React.RefObject<HTMLButtonElement | null>;
}

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer size={16} />, label: "Select / Pan (S)" },
  { id: "marker", icon: <MapPin size={16} />, label: "Place Marker (M)" },
  { id: "polygon", icon: <Pentagon size={16} />, label: "Draw Polygon (P)" },
  { id: "rectangle", icon: <Square size={16} />, label: "Draw Rectangle (R)" },
  { id: "circle", icon: <Circle size={16} />, label: "Draw Circle (C)" },
  { id: "measure", icon: <Ruler size={16} />, label: "Measure Distance (E)" },
];

const LAYER_CYCLE: MapMode[] = ["osm", "satellite", "topo", "dark"];

const LAYER_TITLES: Record<MapMode, string> = {
  osm:       "Street Map — click for Satellite",
  satellite: "Satellite — click for Topographic",
  topo:      "Topographic — click for Dark Mode",
  dark:      "Dark Mode — click for Street Map",
};

export default function Toolbar({
  activeTool,
  onToolChange,
  mapMode,
  onMapModeChange,
  onExport,
  onImport,
  onClearAll,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchResults,
  searchError,
  onResultSelect,
  onResultsDismiss,
  elementCount,
  onProjectsToggle,
  projectsBtnRef,
}: ToolbarProps) {
  const hasDropdown = searchResults.length > 0 || searchError !== null;

  return (
    <div className="toolbar">
      {/* Logo + Projects button */}
      <div className="toolbar-logo-area">
        <button
          ref={projectsBtnRef}
          className="toolbar-logo-btn"
          onClick={onProjectsToggle}
          title="My Maps"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C7.589 2 4 5.589 4 10c0 5.25 7.2 12.35 7.51 12.65a.7.7 0 0 0 .98 0C12.8 22.35 20 15.25 20 10c0-4.411-3.589-8-8-8z" fill="#2563eb"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        </button>
        <span className="toolbar-logo-text">MapNotes</span>
      </div>

      <div className="toolbar-divider" />

      {/* Search */}
      <div className="search-group" style={{ position: "relative" }}>
        <input
          type="search"
          className="search-input"
          placeholder="Search address..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearchSubmit();
            if (e.key === "Escape") onResultsDismiss();
          }}
        />
        <button className="search-btn" onClick={onSearchSubmit} title="Search">
          <Search size={14} />
        </button>

        {/* Dropdown: results or error */}
        {hasDropdown && (
          <div className="search-dropdown">
            {searchError && (
              <div className="search-dropdown-error">{searchError}</div>
            )}
            {searchResults.map((r, i) => (
              <button
                key={i}
                className="search-dropdown-item"
                onClick={() => onResultSelect(r)}
                title={r.name}
              >
                <span className="search-dropdown-icon">📍</span>
                <span className="search-dropdown-name">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Drawing Tools */}
      <div className="toolbar-group">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? "tool-btn-active" : ""}`}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* Undo / Redo */}
      <div className="toolbar-group">
        <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button className="tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Layer cycle button */}
      <button
        className={`tool-btn ${mapMode !== "osm" ? "tool-btn-active" : ""}`}
        onClick={() => {
          const idx = LAYER_CYCLE.indexOf(mapMode);
          onMapModeChange(LAYER_CYCLE[(idx + 1) % LAYER_CYCLE.length]);
        }}
        title={LAYER_TITLES[mapMode]}
      >
        <Layers size={16} />
      </button>

      <div className="toolbar-spacer" />

      {/* Data Management */}
      <div className="toolbar-group">
        <button className="tool-btn" onClick={onExport} title="Export GeoJSON">
          <Upload size={16} />
        </button>
        <button className="tool-btn" onClick={onImport} title="Import GeoJSON">
          <FolderOpen size={16} />
        </button>
        <button
          className="tool-btn tool-btn-danger"
          onClick={() => {
            if (window.confirm("Clear all markers and shapes? This cannot be undone.")) {
              onClearAll();
            }
          }}
          title="Clear All"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Element Count Badge */}
      {elementCount > 0 && (
        <div className="toolbar-badge" title={`${elementCount} element(s) on map`}>
          {elementCount}
        </div>
      )}
    </div>
  );
}
