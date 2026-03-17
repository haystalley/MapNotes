import React from "react";
import { Ruler, X } from "lucide-react";
import { measureDistance, formatDistance } from "@/lib/geo";

interface MeasurePanelProps {
  points: [number, number][];
  onClear: () => void;
}

export default function MeasurePanel({ points, onClear }: MeasurePanelProps) {
  if (points.length === 0) return null;

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
          <span className="measure-value">{points.length}</span>
        </div>
        <div className="measure-stat">
          <span className="measure-label">Total Distance</span>
          <span className="measure-value">{formatDistance(totalDistance)}</span>
        </div>
        {points.length >= 2 && (
          <div className="measure-stat">
            <span className="measure-label">Last Segment</span>
            <span className="measure-value">
              {formatDistance(
                measureDistance(
                  points[points.length - 2][0],
                  points[points.length - 2][1],
                  points[points.length - 1][0],
                  points[points.length - 1][1]
                )
              )}
            </span>
          </div>
        )}
      </div>
      <p className="measure-hint">Click on the map to add measurement points</p>
    </div>
  );
}
