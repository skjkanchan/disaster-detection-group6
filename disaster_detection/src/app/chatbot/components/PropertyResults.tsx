"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type PropertyRecord = {
  id: string;
  lat: number;
  lon: number;
  damage_label: string;
  confidence: number;
  explanation?: string;
  address?: string;
  street?: string;
  region?: string;
};

const DAMAGE_COLORS: Record<string, string> = {
  destroyed: "#ef4444",
  major: "#f97316",
  minor: "#eab308",
  "no damage": "#22c55e",
  "no_damage": "#22c55e",
};

const BADGE_STYLES: Record<string, string> = {
  destroyed: "bg-red-500/20 text-red-400 border-red-500/30",
  major: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  minor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "no damage": "bg-green-500/20 text-green-400 border-green-500/30",
  "no_damage": "bg-green-500/20 text-green-400 border-green-500/30",
};

function getColor(label: string): string {
  return DAMAGE_COLORS[label.toLowerCase()] ?? "#6b7280";
}

function getBadgeStyle(label: string): string {
  return BADGE_STYLES[label.toLowerCase()] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

function AutoFitBounds({ records }: { records: PropertyRecord[] }) {
  const map = useMap();
  useEffect(() => {
    if (records.length === 0) return;
    const bounds = L.latLngBounds(records.map((r) => [r.lat, r.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }, [records, map]);
  return null;
}

export default function PropertyResults({ records }: { records: PropertyRecord[] }) {
  if (!records || records.length === 0) return null;

  return (
    <div className="mt-3 space-y-3 max-w-[560px]">
      {/* Mini-map */}
      <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: 300 }}>
        <MapContainer
          center={[records[0].lat, records[0].lon]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AutoFitBounds records={records} />
          {records.map((r) => (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lon]}
              radius={8}
              fillColor={getColor(r.damage_label)}
              fillOpacity={0.85}
              color="#fff"
              weight={1.5}
            >
              <Popup>
                <div className="text-xs">
                  <strong>{r.address || r.id}</strong>
                  <br />
                  {r.damage_label} &mdash; {(r.confidence * 100).toFixed(0)}%
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Data cards */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {records.map((r) => (
          <div
            key={r.id}
            className="flex items-start gap-3 rounded-lg bg-gray-800/60 border border-gray-700 px-4 py-3"
          >
            <div
              className="mt-1 h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: getColor(r.damage_label) }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white truncate">
                  {r.address || r.id}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getBadgeStyle(r.damage_label)}`}
                >
                  {r.damage_label}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1 space-x-3">
                <span>Confidence: {(r.confidence * 100).toFixed(0)}%</span>
                <span>Lat: {r.lat.toFixed(4)}</span>
                <span>Lon: {r.lon.toFixed(4)}</span>
                {r.street && <span>Street: {r.street}</span>}
                {r.region && <span>Region: {r.region}</span>}
              </div>
              {r.explanation && (
                <p className="text-xs text-gray-500 mt-1 italic">{r.explanation}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
