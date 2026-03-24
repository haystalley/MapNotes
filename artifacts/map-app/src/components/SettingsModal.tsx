import React, { useEffect, useRef } from "react";
import { X, Ruler } from "lucide-react";
import { DistanceUnit } from "@/lib/geo";

export type { DistanceUnit };

const UNIT_OPTIONS: { value: DistanceUnit; label: string; sublabel: string }[] = [
  { value: "km", label: "Kilometers", sublabel: "km" },
  { value: "m",  label: "Meters",     sublabel: "m"  },
  { value: "mi", label: "Miles",       sublabel: "mi" },
  { value: "ft", label: "Feet",        sublabel: "ft" },
];

type SettingsSection = "units";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  distanceUnit: DistanceUnit;
  onDistanceUnitChange: (unit: DistanceUnit) => void;
}

export default function SettingsModal({
  open,
  onClose,
  distanceUnit,
  onDistanceUnitChange,
}: SettingsModalProps) {
  const [activeSection] = React.useState<SettingsSection>("units");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="settings-overlay"
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="settings-modal">
        <div className="settings-modal-header">
          <span className="settings-modal-title">Settings</span>
          <button className="btn-icon-sm" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>

        <div className="settings-modal-body">
          <nav className="settings-nav">
            <button className={`settings-nav-item ${activeSection === "units" ? "settings-nav-item-active" : ""}`}>
              <Ruler size={14} />
              <span>Units</span>
            </button>
          </nav>

          <div className="settings-content">
            {activeSection === "units" && (
              <div className="settings-section">
                <h3 className="settings-section-title">Measurement Units</h3>
                <p className="settings-section-desc">
                  Choose the units used for the measure tool.
                </p>
                <div className="settings-unit-options">
                  {UNIT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`settings-unit-option ${distanceUnit === opt.value ? "settings-unit-option-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="distanceUnit"
                        value={opt.value}
                        checked={distanceUnit === opt.value}
                        onChange={() => onDistanceUnitChange(opt.value)}
                        className="settings-unit-radio"
                      />
                      <span className="settings-unit-label">{opt.label}</span>
                      <span className="settings-unit-sublabel">{opt.sublabel}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
