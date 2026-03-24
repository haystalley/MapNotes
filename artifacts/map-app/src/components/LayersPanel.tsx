import React, { useEffect, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import { LayerId, ActiveLayer, LAYER_LABELS, LAYER_DESCRIPTIONS, LAYER_IS_OVERLAY, LAYER_SUPPORTS_BLEND } from "@/types";

const ALL_LAYERS: LayerId[] = ["street", "satellite", "topo", "contour", "hillshade"];

interface LayersPanelProps {
  open: boolean;
  onClose: () => void;
  activeLayers: ActiveLayer[];
  onToggleLayer: (id: LayerId) => void;
  onOpacityChange: (id: LayerId, opacity: number) => void;
  onBlendModeToggle: (id: LayerId) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function LayerIcon({ id }: { id: LayerId }) {
  const icons: Record<LayerId, string> = {
    street: "🗺",
    satellite: "🛰",
    topo: "⛰",
    hillshade: "🏔",
    contour: "🗻",
  };
  return <span style={{ fontSize: 16 }}>{icons[id]}</span>;
}

export default function LayersPanel({
  open,
  onClose,
  activeLayers,
  onToggleLayer,
  onOpacityChange,
  onBlendModeToggle,
  triggerRef,
}: LayersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, triggerRef]);

  useLayoutEffect(() => {
    if (!open || !panelRef.current || !triggerRef.current) return;
    const btn = triggerRef.current.getBoundingClientRect();
    const parent = panelRef.current.offsetParent as HTMLElement | null;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const panelWidth = 320;
    let left = btn.left - parentRect.left;
    const maxLeft = parentRect.width - panelWidth - 8;
    left = Math.max(8, Math.min(left, maxLeft));
    panelRef.current.style.left = `${left}px`;
  }, [open, triggerRef]);

  if (!open) return null;

  const activeIds = new Set(activeLayers.map((l) => l.id));

  return (
    <div className="layers-panel" ref={panelRef}>
      <div className="layers-panel-header">
        <span className="layers-panel-title">Map Layers</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="layers-panel-count">
            {activeLayers.length}/2 active
          </span>
          <button className="btn-icon-sm" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="layers-panel-body">
        {ALL_LAYERS.map((id) => {
          const isActive = activeIds.has(id);
          const activeLayer = activeLayers.find((l) => l.id === id);
          const isOverlay = LAYER_IS_OVERLAY[id];
          const supportsBlend = LAYER_SUPPORTS_BLEND[id];
          const isMultiply = activeLayer?.blendMode === "multiply";

          return (
            <div
              key={id}
              className={`layer-row ${isActive ? "layer-row-active" : ""}`}
            >
              <div className="layer-row-top">
                <label className="layer-checkbox-label">
                  <input
                    type="checkbox"
                    className="layer-checkbox"
                    checked={isActive}
                    onChange={() => onToggleLayer(id)}
                  />
                  <LayerIcon id={id} />
                  <div className="layer-row-info">
                    <span className="layer-name">
                      {LAYER_LABELS[id]}
                      {isOverlay && (
                        <span className="layer-overlay-badge">overlay</span>
                      )}
                    </span>
                    <span className="layer-desc">{LAYER_DESCRIPTIONS[id]}</span>
                  </div>
                </label>
              </div>

              {isActive && activeLayer && (
                <>
                  <div className="layer-opacity-row">
                    <span className="layer-opacity-label">Opacity</span>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={Math.round(activeLayer.opacity * 100)}
                      onChange={(e) =>
                        onOpacityChange(id, parseInt(e.target.value) / 100)
                      }
                      className="layer-opacity-slider"
                      title={`${Math.round(activeLayer.opacity * 100)}%`}
                    />
                    <span className="layer-opacity-value">
                      {Math.round(activeLayer.opacity * 100)}%
                    </span>
                  </div>

                  {supportsBlend && (
                    <div className="layer-blend-row">
                      <label className="layer-blend-label">
                        <input
                          type="checkbox"
                          className="layer-checkbox"
                          checked={isMultiply}
                          onChange={() => onBlendModeToggle(id)}
                        />
                        <span className="layer-blend-text">
                          Multiply blend
                          <span className="layer-blend-hint">
                            {isMultiply ? "— white background hidden" : "— hides white background when overlaid"}
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="layers-panel-footer">
        Max 2 layers active — oldest auto-deactivates when a third is added
      </div>
    </div>
  );
}
