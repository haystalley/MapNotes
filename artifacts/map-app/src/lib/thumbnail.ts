import { MapElement } from "./db";

export function generateThumbnail(elements: MapElement[]): string {
  const W = 120, H = 80;

  const points: Array<{ x: number; y: number; color: string }> = [];

  const raw: Array<{ lat: number; lng: number; color: string }> = [];
  for (const el of elements) {
    if (el.type === "marker") {
      raw.push({ lat: el.lat, lng: el.lng, color: el.color });
    } else if ("center" in el && el.center) {
      raw.push({ lat: el.center[0], lng: el.center[1], color: el.color });
    } else if ("geojson" in el) {
      const g = el.geojson as { coordinates?: number[][][] };
      if (g.coordinates?.[0]?.[0]) {
        raw.push({ lat: g.coordinates[0][0][1], lng: g.coordinates[0][0][0], color: el.color });
      }
    }
  }

  if (raw.length === 0) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#eff6ff"/>
      </linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#g)" rx="4"/>
      <text x="${W / 2}" y="${H / 2 + 8}" text-anchor="middle" font-size="28">🗺️</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const lats = raw.map((p) => p.lat);
  const lngs = raw.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 12;
  const rangeX = maxLng - minLng || 0.001;
  const rangeY = maxLat - minLat || 0.001;

  for (const p of raw) {
    points.push({
      x: pad + ((p.lng - minLng) / rangeX) * (W - 2 * pad),
      y: H - pad - ((p.lat - minLat) / rangeY) * (H - 2 * pad),
      color: p.color,
    });
  }

  const dots = points
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${p.color}" opacity="0.85" stroke="white" stroke-width="1.2"/>`)
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#eff6ff"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)" rx="4"/>
    <rect x="0" y="${H - 14}" width="${W}" height="14" fill="#bfdbfe" rx="0"/>
    ${dots}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
