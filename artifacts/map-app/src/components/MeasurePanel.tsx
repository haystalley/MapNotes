import React from "react";
import { Ruler, X } from "lucide-react";
import { measureDistance, formatDistance, DistanceUnit } from "@/lib/geo";

interface MeasurePanelProps {
  points: [number, number][];
  onClear: () => void;
  unit: DistanceUnit;
}

export default function MeasurePanel({ points, onClear, unit }: MeasurePanelProps) {
  if (points.length === 0) return null;

  const isClosed =
    points.length >= 3 &&
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1];

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += measureDistance(
      points[i - 1][0], points[i - 1][1],
      points[i][0], points[i][1]
    );
  }

  return (
    <div className="measure-panel">
      <div className="measure-header">
        <Ruler size={14} />
        <span>Measurement</span>
        <button className="btn-icon-sm ml-auto" onClick={onClear}>
          <X size={12} />
        </button>
      </div>
      <div className="measure-body">
        <div className="measure-stat">
          <span className="measure-label">Points</span>
          <span className="measure-value">{isClosed ? points.length - 1 : points.length}</span>
        </div>
        <div className="measure-stat">
          <span className="measure-label">{isClosed ? "Perimeter" : "Total Distance"}</span>
          <span className="measure-value">{formatDistance(totalDistance, unit)}</span>
        </div>
        {!isClosed && points.length >= 2 && (
          <div className="measure-stat">
            <span className="measure-label">Last Segment</span>
            <span className="measure-value">
              {formatDistance(
                measureDistance(
                  points[points.length - 2][0],
                  points[points.length - 2][1],
                  points[points.length - 1][0],
                  points[points.length - 1][1]
                ),
                unit
              )}
            </span>
          </div>
        )}
      </div>
      <p className="measure-hint">
        {isClosed
          ? "Loop closed — click map to start a new measurement"
          : points.length === 0
          ? "Click map to start measuring"
          : "Double-click to finish · click near start point to close loop"}
      </p>
    </div>
  );
}
