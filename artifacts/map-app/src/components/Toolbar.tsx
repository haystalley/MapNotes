import React, { useRef } from "react";
import {
  MapPin, Pentagon, Square, Circle, MousePointer,
  Search, Upload, FolderOpen, Trash2,
  Undo2, Redo2, Ruler, Moon, Map
} from "lucide-react";
import { LayerId, ActiveLayer } from "@/types";

export type Tool =
  | "select"
  | "marker"
  | "polygon"
  | "rectangle"
  | "circle"
  | "measure";

export type SearchResult = {
  lat: number;
  lng: number;
  name: string;
};

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  darkMode: boolean;
  onDarkModeToggle: () => void;
  onLayersPanelToggle: () => void;
  layersPanelBtnRef: React.RefObject<HTMLButtonElement | null>;
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
  activeLayers: ActiveLayer[];
}

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer size={16} />, label: "Select / Pan (S)" },
  { id: "marker", icon: <MapPin size={16} />, label: "Place Marker (M)" },
  { id: "polygon", icon: <Pentagon size={16} />, label: "Draw Polygon (P)" },
  { id: "rectangle", icon: <Square size={16} />, label: "Draw Rectangle (R)" },
  { id: "circle", icon: <Circle size={16} />, label: "Draw Circle (C)" },
  { id: "measure", icon: <Ruler size={16} />, label: "Measure Distance (E)" },
];

export default function Toolbar({
  activeTool,
  onToolChange,
  darkMode,
  onDarkModeToggle,
  onLayersPanelToggle,
  layersPanelBtnRef,
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
  activeLayers,
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
          <Map size={20} color="#2563eb" strokeWidth={2} />
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

      {/* Layers panel button */}
      <button
        ref={layersPanelBtnRef}
        className={`tool-btn ${activeLayers.length > 1 || activeLayers.some(l => l.id === "contour") ? "tool-btn-active" : ""}`}
        onClick={onLayersPanelToggle}
        title="Layers panel — control all map layers"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </button>

      {/* Dark mode moon button */}
      <button
        className={`tool-btn ${darkMode ? "tool-btn-active" : ""}`}
        onClick={onDarkModeToggle}
        title={darkMode ? "Dark mode ON — click to disable" : "Dark mode OFF — click to enable"}
      >
        {darkMode ? (
          <Moon size={15} fill="currentColor" />
        ) : (
          <Moon size={15} />
        )}
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

      {elementCount > 0 && (
        <div className="toolbar-badge" title={`${elementCount} element(s) on map`}>
          {elementCount}
        </div>
      )}
    </div>
  );
}
