"use client";

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
  no_damage: "#22c55e",
};

const BADGE_STYLES: Record<string, string> = {
  destroyed: "bg-red-500/20 text-red-400 border-red-500/30",
  major: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  minor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "no damage": "bg-green-500/20 text-green-400 border-green-500/30",
  no_damage: "bg-green-500/20 text-green-400 border-green-500/30",
};

function getColor(label: string): string {
  return DAMAGE_COLORS[label.toLowerCase()] ?? "#6b7280";
}

function getBadgeStyle(label: string): string {
  return BADGE_STYLES[label.toLowerCase()] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

/**
 * Compact, map-less list of property records that accompanies a chatbot reply.
 * The main Mapbox map above is the single source of truth for geography; this
 * component only renders the tabular details for each matched property.
 */
export default function PropertyResults({ records }: { records: PropertyRecord[] }) {
  if (!records || records.length === 0) return null;

  return (
    <div className="mt-3 space-y-3 max-w-[560px]">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {records.length} matched {records.length === 1 ? "property" : "properties"} — highlighted on the map above
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {records.map((r) => (
          <div
            key={r.id}
            className="flex items-start gap-3 rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3"
          >
            <div
              className="mt-1 h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: getColor(r.damage_label) }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-zinc-800 truncate">
                  {r.address || r.id}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getBadgeStyle(r.damage_label)}`}
                >
                  {r.damage_label}
                </span>
              </div>
              <div className="text-xs text-zinc-600 mt-1 flex flex-wrap gap-x-3">
                <span>Confidence: {(r.confidence * 100).toFixed(0)}%</span>
                <span>Lat: {r.lat.toFixed(4)}</span>
                <span>Lon: {r.lon.toFixed(4)}</span>
                {r.street && <span>Street: {r.street}</span>}
                {r.region && <span>Region: {r.region}</span>}
              </div>
              {r.explanation && (
                <p className="text-xs text-zinc-600 mt-1 italic">{r.explanation}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
