"use client";

import { useState } from "react";
import Image from "next/image";
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

const HOT_SPOTS: Array<{
  id: string;
  left: number;
  top: number;
  damageClass: keyof typeof DAMAGE_COLORS;
  label: string;
  pct?: number;
  coords?: string;
  explanation?: string;
}> = [
    { id: "1", left: 22, top: 38, damageClass: "major", label: "Red-roofed building", pct: 85, coords: "32.99, -96.75", explanation: "Roof partially collapsed; visible debris." },
    { id: "2", left: 78, top: 72, damageClass: "minor", label: "Blue-roof cluster", pct: 42, coords: "32.98, -96.73", explanation: "Minor shingle damage; structure intact." },
    { id: "3", left: 82, top: 18, damageClass: "no_damage", label: "Sports court / large structure", pct: 12, coords: "33.01, -96.74", explanation: "No visible structural change." },
    { id: "4", left: 48, top: 52, damageClass: "destroyed", label: "Dense residential block", pct: 94, coords: "33.00, -96.76", explanation: "Multiple structures severely damaged or collapsed." },
    { id: "5", left: 62, top: 28, damageClass: "minor", label: "Residential cluster", pct: 38, coords: "32.99, -96.74", explanation: "Scattered roof and facade damage." },
    { id: "6", left: 18, top: 68, damageClass: "major", label: "White-roof area", pct: 71, coords: "32.97, -96.75", explanation: "Significant roof failure; possible interior exposure." },
    { id: "7", left: 35, top: 22, damageClass: "no_damage", label: "Vegetation / open area", pct: 8, coords: "33.00, -96.75", explanation: "Landscape unchanged." },
  ];

const SEVERITY_OPTIONS = ["All", "No damage", "Minor", "Major", "Destroyed"];

export default function GeospatialDashboard() {
  const [hoverSpot, setHoverSpot] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<typeof HOT_SPOTS[0] | null>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [imageryType, setImageryType] = useState<"pre" | "post" | "none">("post");

  const severityToKey: Record<string, string> = {
    "No damage": "no_damage",
    "Minor": "minor",
    "Major": "major",
    "Destroyed": "destroyed",
  };
  const filteredSpots = HOT_SPOTS.filter((s) => {
    if (severityFilter !== "All" && severityToKey[severityFilter] !== s.damageClass) return false;
    if (search && !s.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const kpiNoDamage = HOT_SPOTS.filter((s) => s.damageClass === "no_damage").length;
  const kpiDamaged = HOT_SPOTS.length - kpiNoDamage;
  const kpiPctDamaged = HOT_SPOTS.length ? Math.round((kpiDamaged / HOT_SPOTS.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: Search, Filter, KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search location or label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm w-48 max-w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* KPI summary */}
        <div className="flex flex-wrap items-center gap-4 text-sm bg-zinc-50 px-4 py-1.5 rounded-md border border-zinc-100">
          <span className="text-zinc-600">
            <strong className="text-zinc-900">{HOT_SPOTS.length}</strong> assessed
          </span>
          <span className="text-zinc-600 border-l border-zinc-300 pl-4">
            <strong className="text-zinc-900">{kpiPctDamaged}%</strong> damaged
          </span>
          <span className="text-zinc-600 hidden lg:inline border-l border-zinc-300 pl-4">
            <span className="text-green-600 font-medium">No/minor: {HOT_SPOTS.filter((s) => s.damageClass === "no_damage" || s.damageClass === "minor").length}</span>
            <span className="mx-2">·</span>
            <span className="text-red-500 font-medium">Major/destroyed: {HOT_SPOTS.filter((s) => s.damageClass === "major" || s.damageClass === "destroyed").length}</span>
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Map & Legend */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="text-sm font-bold text-zinc-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Hurricane Matthew — Geospatial Assessment
            </div>
            
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

          <DamageMap imagery={imageryType} />

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

        {/* Right Column: Sidebar (Hotspot details + Chart) */}
        <div className="flex flex-col gap-4">
          {/* Hotspot detail panel */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col h-[280px]">
            <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Location Inspector
              </h3>
              {selectedSpot && (
                <button
                  type="button"
                  onClick={() => setSelectedSpot(null)}
                  className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              )}
            </div>

            <div className="p-4 flex-1 flex flex-col overflow-y-auto">
              {selectedSpot ? (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <div>
                    <h4 className="font-extrabold text-lg text-zinc-900 leading-tight">{selectedSpot.label}</h4>
                    {selectedSpot.coords && (
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedSpot.coords}</p>
                    )}
                  </div>

                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: DAMAGE_COLORS[selectedSpot.damageClass] }} />
                      <span className="text-sm font-bold text-zinc-700 capitalize">
                        {selectedSpot.damageClass.replace("_", " ")}
                      </span>
                    </div>
                    {selectedSpot.pct != null && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Confidence</span>
                        <span className="text-sm font-bold text-zinc-700">{selectedSpot.pct}%</span>
                      </div>
                    )}
                  </div>

                  {selectedSpot.explanation && (
                    <div className="mt-1">
                      <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">VLM Analysis</h5>
                      <p className="text-sm text-zinc-700 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 leading-relaxed">
                        {selectedSpot.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
                  <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-zinc-500">No Location Selected</p>
                  <p className="text-xs mt-1.5 px-4">Click on a colored hotspot on the map to view damage details and AI assessment confidence.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
              Damage Distribution
            </h3>
            <DamagePercentageIndicators />
          </div>
        </div>
      </div>
    </div>
  );
}
