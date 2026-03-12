"use client";

import { useState } from "react";
import Image from "next/image";
import DamagePercentageIndicators from "./DamagePercentageIndicators";

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
  const [imageryView, setImageryView] = useState<"pre" | "post" | "side" | "slider">("post");
  const [hoverSpot, setHoverSpot] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<typeof HOT_SPOTS[0] | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");

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
            <span className="text-sm font-bold text-zinc-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Hurricane Matthew — Pre / Post Imagery
            </span>
            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
              {(["post", "pre", "side", "slider"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setImageryView(view)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${imageryView === view
                    ? "bg-white text-sky-700 shadow-sm ring-1 ring-black/5"
                    : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
                    }`}
                >
                  {view === "pre" ? "Pre" : view === "post" ? "Post" : view === "side" ? "Side by Side" : "Slider"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 shadow-inner">
            {imageryView === "slider" && (
              <div className="relative aspect-[4/3] w-full">
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                  <Image src="/hurricane-matthew-pre.png" alt="Pre-disaster" fill className="object-cover object-left-top" sizes="800px" />
                </div>
                <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
                  <Image src="/hurricane-matthew-post.png" alt="Post-disaster" fill className="object-cover object-left-top" sizes="800px" />
                </div>
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none z-10"
                  style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
                >
                  <span className="absolute rounded-full bg-zinc-900 text-white text-[10px] px-2 py-1 font-bold whitespace-nowrap shadow-md">
                    Pre | Post
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
              </div>
            )}
            {imageryView === "side" && (
              <div className="grid grid-cols-2 gap-0.5 bg-zinc-300">
                <div className="relative aspect-[4/3] bg-white">
                  <Image src="/hurricane-matthew-pre.png" alt="Hurricane Matthew pre-disaster" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                  <span className="absolute bottom-3 left-3 rounded-lg bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white shadow-sm border border-white/10">Pre-disaster</span>
                </div>
                <div className="relative aspect-[4/3] bg-white">
                  <Image src="/hurricane-matthew-post.png" alt="Hurricane Matthew post-disaster" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                  <span className="absolute bottom-3 left-3 rounded-lg bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white shadow-sm border border-white/10">Post-disaster</span>
                  {filteredSpots.map((spot) => (
                    <button
                      key={spot.id}
                      type="button"
                      className="absolute w-5 h-5 rounded-full border-[2.5px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all hover:scale-150 focus:outline-none z-10"
                      style={{ left: `${spot.left}%`, top: `${spot.top}%`, transform: "translate(-50%, -50%)", backgroundColor: DAMAGE_COLORS[spot.damageClass] }}
                      title={`${spot.label} — ${spot.damageClass.replace("_", " ")}${spot.pct != null ? ` (${spot.pct}%)` : ""}`}
                      onMouseEnter={() => setHoverSpot(spot.id)}
                      onMouseLeave={() => setHoverSpot(null)}
                      onClick={() => setSelectedSpot(spot)}
                    />
                  ))}
                </div>
              </div>
            )}
            {(imageryView === "pre" || imageryView === "post") && (
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={imageryView === "pre" ? "/hurricane-matthew-pre.png" : "/hurricane-matthew-post.png"}
                  alt={imageryView === "pre" ? "Hurricane Matthew pre-disaster" : "Hurricane Matthew post-disaster with damage hot spots"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
                {imageryView === "post" &&
                  filteredSpots.map((spot) => (
                    <button
                      key={spot.id}
                      type="button"
                      className="absolute w-6 h-6 rounded-full border-[3px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition-all hover:scale-150 focus:outline-none z-10"
                      style={{ left: `${spot.left}%`, top: `${spot.top}%`, transform: "translate(-50%, -50%)", backgroundColor: DAMAGE_COLORS[spot.damageClass], zIndex: hoverSpot === spot.id || selectedSpot?.id === spot.id ? 20 : 10 }}
                      onMouseEnter={() => setHoverSpot(spot.id)}
                      onMouseLeave={() => setHoverSpot(null)}
                      onClick={() => setSelectedSpot(spot)}
                    />
                  ))}
                {imageryView === "pre" && (
                  <span className="absolute bottom-3 left-3 rounded-lg bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white shadow-sm border border-white/10">
                    Pre-disaster Imagery
                  </span>
                )}
                {imageryView === "post" && (
                  <span className="absolute bottom-3 left-3 rounded-lg bg-black/70 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white shadow-sm border border-white/10">
                    Post-disaster — Select hotspots for details
                  </span>
                )}
              </div>
            )}
            {hoverSpot && !selectedSpot && (
              <div className="absolute bottom-3 right-3 max-w-[240px] rounded-xl border border-zinc-200/50 bg-white/95 backdrop-blur px-4 py-3 shadow-xl text-left z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {HOT_SPOTS.filter((s) => s.id === hoverSpot).map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DAMAGE_COLORS[s.damageClass] }} />
                      <p className="font-bold text-zinc-900 text-sm">{s.label}</p>
                    </div>
                    <p className="text-xs text-zinc-600 font-medium pl-4">
                      {s.damageClass.replace("_", " ").toUpperCase()}
                      {s.pct != null && <span className="text-zinc-400 font-normal"> • {s.pct}% conf</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

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
