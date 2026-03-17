import React from "react";
import {
  MapPin, Pentagon, Square, Circle, MousePointer,
  Layers, Search, Download, Upload, Trash2,
  Sun, Moon, Undo2, Redo2, Ruler, Map
} from "lucide-react";

export type Tool =
  | "select"
  | "marker"
  | "polygon"
  | "rectangle"
  | "circle"
  | "measure";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  mapLayer: "osm" | "satellite";
  onLayerToggle: () => void;
  darkMode: boolean;
  onDarkModeToggle: () => void;
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
  elementCount: number;
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
  mapLayer,
  onLayerToggle,
  darkMode,
  onDarkModeToggle,
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
  elementCount,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      {/* Logo */}
      <div className="toolbar-logo">
        <Map size={18} className="toolbar-logo-icon" />
        <span className="toolbar-logo-text">MapNotes</span>
      </div>

      <div className="toolbar-divider" />

      {/* Search */}
      <div className="search-group">
        <input
          type="search"
          className="search-input"
          placeholder="Search address..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
        />
        <button className="search-btn" onClick={onSearchSubmit} title="Search">
          <Search size={14} />
        </button>
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
        <button
          className="tool-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="tool-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Map Layer */}
      <button
        className={`tool-btn ${mapLayer === "satellite" ? "tool-btn-active" : ""}`}
        onClick={onLayerToggle}
        title={`Switch to ${mapLayer === "osm" ? "Satellite" : "Street"} view`}
      >
        <Layers size={16} />
      </button>

      {/* Dark Mode */}
      <button
        className="tool-btn"
        onClick={onDarkModeToggle}
        title="Toggle Dark Mode"
      >
        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="toolbar-spacer" />

      {/* Data Management */}
      <div className="toolbar-group">
        <button className="tool-btn" onClick={onExport} title="Export GeoJSON">
          <Download size={16} />
        </button>
        <button className="tool-btn" onClick={onImport} title="Import GeoJSON">
          <Upload size={16} />
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
