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
    <div className="flex flex-col gap-6">
      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search location or label..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm w-48 max-w-full"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* KPI summary */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <span className="text-zinc-600">
          <strong className="text-zinc-900">{HOT_SPOTS.length}</strong> assessed
        </span>
        <span className="text-zinc-600">
          <strong className="text-zinc-900">{kpiPctDamaged}%</strong> damaged
        </span>
        <span className="text-zinc-600">
          No/minor: {HOT_SPOTS.filter((s) => s.damageClass === "no_damage" || s.damageClass === "minor").length}
          {" · "}
          Major/destroyed: {HOT_SPOTS.filter((s) => s.damageClass === "major" || s.damageClass === "destroyed").length}
        </span>
      </div>

      {/* Hurricane Matthew imagery with hot spots */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700">
            Hurricane Matthew — Pre / post imagery
          </span>
          <div className="flex gap-2">
            {(["post", "pre", "side", "slider"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setImageryView(view)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  imageryView === view
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {view === "pre" ? "Pre" : view === "post" ? "Post" : view === "side" ? "Side by side" : "Slider"}
              </button>
            ))}
          </div>
        </div>
        <div className="relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
          {imageryView === "slider" && (
            <div className="relative aspect-[4/3] min-h-[240px] w-full">
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <Image
                  src="/hurricane-matthew-pre.png"
                  alt="Pre-disaster"
                  fill
                  className="object-cover object-left-top"
                  sizes="800px"
                />
              </div>
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
                <Image
                  src="/hurricane-matthew-post.png"
                  alt="Post-disaster"
                  fill
                  className="object-cover object-left-top"
                  sizes="800px"
                />
              </div>
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow cursor-ew-resize flex items-center justify-center"
                style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
              >
                <span className="absolute rounded bg-zinc-800 text-white text-[10px] px-1 py-0.5 whitespace-nowrap">
                  Pre | Post
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={95}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute bottom-2 left-2 right-2 h-2 accent-sky-600"
              />
            </div>
          )}
          {imageryView === "side" && (
            <div className="grid grid-cols-2 gap-px">
              <div className="relative aspect-[4/3] min-h-[200px]">
                <Image
                  src="/hurricane-matthew-pre.png"
                  alt="Hurricane Matthew pre-disaster"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  Pre-disaster
                </span>
              </div>
              <div className="relative aspect-[4/3] min-h-[200px]">
                <Image
                  src="/hurricane-matthew-post.png"
                  alt="Hurricane Matthew post-disaster"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  Post-disaster
                </span>
                {filteredSpots.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500"
                    style={{
                      left: `${spot.left}%`,
                      top: `${spot.top}%`,
                      transform: "translate(-50%, -50%)",
                      backgroundColor: DAMAGE_COLORS[spot.damageClass],
                    }}
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
            <div className="relative aspect-[4/3] min-h-[240px] w-full">
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
                    className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500"
                    style={{
                      left: `${spot.left}%`,
                      top: `${spot.top}%`,
                      transform: "translate(-50%, -50%)",
                      backgroundColor: DAMAGE_COLORS[spot.damageClass],
                    }}
                    title={`${spot.label} — ${spot.damageClass.replace("_", " ")}${spot.pct != null ? ` (${spot.pct}%)` : ""}`}
                    onMouseEnter={() => setHoverSpot(spot.id)}
                    onMouseLeave={() => setHoverSpot(null)}
                    onClick={() => setSelectedSpot(spot)}
                  />
                ))}
              {imageryView === "pre" && (
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  Pre-disaster
                </span>
              )}
              {imageryView === "post" && (
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  Post-disaster — hover hot spots for detail
                </span>
              )}
            </div>
          )}
          {hoverSpot && !selectedSpot && (
            <div className="absolute bottom-2 right-2 max-w-[220px] rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 shadow-lg text-left">
              {HOT_SPOTS.filter((s) => s.id === hoverSpot).map((s) => (
                <div key={s.id}>
                  <p className="font-medium text-zinc-900 text-sm">{s.label}</p>
                  <p className="text-xs text-zinc-600 capitalize">
                    {s.damageClass.replace("_", " ")}
                    {s.pct != null && ` · ${s.pct}% confidence`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hotspot detail panel (on click) */}
      {selectedSpot && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-2">
              <p className="font-medium text-zinc-900">{selectedSpot.label}</p>
              <p className="text-sm text-zinc-600 capitalize">
                Severity: {selectedSpot.damageClass.replace("_", " ")}
                {selectedSpot.pct != null && ` · ${selectedSpot.pct}% confidence`}
              </p>
              {selectedSpot.coords && (
                <p className="text-xs text-zinc-500">Coords: {selectedSpot.coords}</p>
              )}
              {selectedSpot.explanation && (
                <p className="text-sm text-zinc-700 mt-1">{selectedSpot.explanation}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedSpot(null)}
              className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Legend + distribution */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-zinc-700">
          Hurricane damage level
        </span>
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
      </div>
      <DamagePercentageIndicators />
    </div>
  );
}
