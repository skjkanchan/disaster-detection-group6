"use client";

import { useState } from "react";
import DamagePercentageIndicators from "./DamagePercentageIndicators";
import DamageMap from "./DamageMap";

const DAMAGE_COLORS: Record<string, string> = {
  no_damage: "#22c55e",
  minor: "#eab308",
  major: "#f97316",
  destroyed: "#ef4444",
};

const LEGEND_ENTRIES = [
  { key: "no_damage", label: "Little / no visible damage" },
  { key: "minor", label: "Minor wind / roof damage" },
  { key: "major", label: "Major structural damage" },
  { key: "destroyed", label: "Destroyed / uninhabitable" },
];

export default function GeospatialDashboard() {
  const [imageryType, setImageryType] = useState<"pre" | "post" | "none">("post");
  const [showHeatmap, setShowHeatmap] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      {/* Main Content Area */}
      <div className="flex flex-col gap-6">
        {/* Map & Legend */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="text-sm font-bold text-zinc-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Hurricane Matthew — Geospatial Assessment
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${showHeatmap ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"}`}
              >
                {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
              </button>

              <div className="flex rounded-lg overflow-hidden border border-zinc-200 bg-white">
                  <button 
                    className={`px-3 py-1.5 text-xs font-semibold ${imageryType === "pre" ? "bg-indigo-600 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
                    onClick={() => setImageryType("pre")}
                  >
                    Pre-Disaster
                  </button>
                  <div className="w-px bg-zinc-200"></div>
                  <button 
                    className={`px-3 py-1.5 text-xs font-semibold ${imageryType === "post" ? "bg-indigo-600 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
                    onClick={() => setImageryType("post")}
                  >
                    Post-Disaster
                  </button>
                  <div className="w-px bg-zinc-200"></div>
                  <button 
                    className={`px-3 py-1.5 text-xs font-semibold ${imageryType === "none" ? "bg-indigo-600 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
                    onClick={() => setImageryType("none")}
                  >
                    Base Map
                  </button>
              </div>
            </div>
          </div>

          <DamageMap imagery={imageryType} showHeatmap={showHeatmap} />

          {/* Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-1 p-3.5 bg-white rounded-xl border border-zinc-200 shadow-sm">
            <span className="text-sm font-bold text-zinc-800 shrink-0">
              Severity Legend:
            </span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {LEGEND_ENTRIES.map(({ key, label }) => (
                <span key={key} className="flex items-center gap-2 text-sm text-zinc-600 font-medium">
                  <span className="w-3.5 h-3.5 rounded-full shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: DAMAGE_COLORS[key] }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

      {/* Damage Distribution below map */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
            Damage Distribution
          </h3>
          <DamagePercentageIndicators />
        </div>
      </div>
    </div>
  );
}
