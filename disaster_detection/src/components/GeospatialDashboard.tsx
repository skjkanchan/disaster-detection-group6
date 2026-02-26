"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const GeospatialMap = dynamic(() => import("./GeospatialMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] flex items-center justify-center bg-zinc-100 rounded-lg text-zinc-500">
      Loading map…
    </div>
  ),
});

// Legend colors (duplicated here so we never import GeospatialMap on the server)
const DAMAGE_COLORS: Record<string, string> = {
  no_damage: "#22c55e",
  minor: "#eab308",
  major: "#f97316",
  destroyed: "#ef4444",
};

const LEGEND_ENTRIES = [
  { key: "no_damage", label: "No damage" },
  { key: "minor", label: "Minor" },
  { key: "major", label: "Major" },
  { key: "destroyed", label: "Destroyed" },
];

export default function GeospatialDashboard() {
  const [showPredictions, setShowPredictions] = useState(true);
  const [showFema, setShowFema] = useState(false);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-zinc-700">Damage</span>
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND_ENTRIES.map(({ key, label }) => (
            <span key={key} className="flex items-center gap-1.5 text-sm text-zinc-600">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: DAMAGE_COLORS[key] }}
              />
              {label}
            </span>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showPredictions}
              onChange={(e) => setShowPredictions(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Predictions
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showFema}
              onChange={(e) => setShowFema(e.target.checked)}
              className="rounded border-zinc-300"
            />
            FEMA
          </label>
        </div>
      </div>
      <div className="flex-1 min-h-[400px] rounded-lg overflow-hidden border border-zinc-200 bg-white">
        <GeospatialMap
          showPredictions={showPredictions}
          showFema={showFema}
        />
      </div>
    </div>
  );
}
