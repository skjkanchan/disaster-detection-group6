"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type DamageClass =
  | "no_damage"
  | "minor"
  | "major"
  | "destroyed";

export interface DamagePoint {
  id: string;
  lat: number;
  lon: number;
  damageClass: DamageClass;
  confidence?: number;
  label: string;
}

const DAMAGE_COLORS: Record<DamageClass, string> = {
  no_damage: "#22c55e",
  minor: "#eab308",
  major: "#f97316",
  destroyed: "#ef4444",
};

const SAMPLE_POINTS: DamagePoint[] = [
  { id: "1", lat: 32.99, lon: -96.75, damageClass: "no_damage", label: "No damage", confidence: 0.92 },
  { id: "2", lat: 33.0, lon: -96.74, damageClass: "minor", label: "Minor", confidence: 0.88 },
  { id: "3", lat: 33.01, lon: -96.76, damageClass: "major", label: "Major", confidence: 0.85 },
  { id: "4", lat: 32.98, lon: -96.73, damageClass: "destroyed", label: "Destroyed", confidence: 0.91 },
];

function useLeafletIconFix() {
  useEffect(() => {
    const icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = icon;
  }, []);
}

function MapLayers({
  showPredictions,
  showFema,
  points,
}: {
  showPredictions: boolean;
  showFema: boolean;
  points: DamagePoint[];
}) {
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showPredictions &&
        points.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lon]}
            radius={10}
            pathOptions={{
              fillColor: DAMAGE_COLORS[point.damageClass],
              color: "#1e293b",
              weight: 1,
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div className="min-w-[140px]">
                <p className="font-medium text-zinc-900">{point.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Confidence: {point.confidence != null ? `${(point.confidence * 100).toFixed(0)}%` : "—"}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      {showFema && (
        <>
          {points.slice(0, 2).map((point) => (
            <CircleMarker
              key={`fema-${point.id}`}
              center={[point.lat + 0.002, point.lon + 0.002]}
              radius={6}
              pathOptions={{
                fillColor: "transparent",
                color: "#0f172a",
                weight: 2,
                dashArray: "4 4",
              }}
            >
              <Popup>
                <span className="text-xs font-medium">FEMA (ground truth)</span>
              </Popup>
            </CircleMarker>
          ))}
        </>
      )}
    </>
  );
}

export default function GeospatialMap({
  showPredictions = true,
  showFema = false,
  points = SAMPLE_POINTS,
}: {
  showPredictions?: boolean;
  showFema?: boolean;
  points?: DamagePoint[];
}) {
  useLeafletIconFix();

  return (
    <MapContainer
      center={[33.0, -96.75]}
      zoom={12}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
    >
      <MapLayers
        showPredictions={showPredictions}
        showFema={showFema}
        points={points}
      />
    </MapContainer>
  );
}

export { DAMAGE_COLORS };
