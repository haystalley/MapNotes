import { MapElement, MapMarker, MapShape } from "./db";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function elementsToGeoJSON(elements: MapElement[]): object {
  const features = elements.map((el) => {
    if (el.type === "marker") {
      const m = el as MapMarker;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [m.lng, m.lat],
        },
        properties: {
          id: m.id,
          type: m.type,
          title: m.title,
          description: m.description,
          tags: m.tags,
          date: m.date,
          color: m.color,
          iconType: m.iconType,
          createdAt: m.createdAt,
        },
      };
    } else {
      const s = el as MapShape;
      return {
        type: "Feature",
        geometry: s.geojson,
        properties: {
          id: s.id,
          type: s.type,
          title: s.title,
          description: s.description,
          tags: s.tags,
          date: s.date,
          color: s.color,
          fillColor: s.fillColor,
          opacity: s.opacity,
          center: s.center,
          radius: s.radius,
          createdAt: s.createdAt,
        },
      };
    }
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

export function downloadJSON(data: object, filename: string): void {
  const str = JSON.stringify(data, null, 2);
  const blob = new Blob([str], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function measureDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type DistanceUnit = "km" | "m" | "mi" | "ft";

export function formatDistance(meters: number, unit: DistanceUnit = "km"): string {
  switch (unit) {
    case "m":
      return `${Math.round(meters)} m`;
    case "km":
      if (meters < 1000) return `${Math.round(meters)} m`;
      return `${(meters / 1000).toFixed(2)} km`;
    case "mi": {
      const miles = meters / 1609.344;
      if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
      return `${miles.toFixed(2)} mi`;
    }
    case "ft":
      return `${Math.round(meters * 3.28084)} ft`;
  }
}

export function formatArea(sqMeters: number): string {
  if (sqMeters < 10000) return `${Math.round(sqMeters)} m²`;
  return `${(sqMeters / 1e6).toFixed(4)} km²`;
}
