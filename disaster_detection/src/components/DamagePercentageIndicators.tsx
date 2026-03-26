"use client";

const DAMAGE_COLORS: Record<string, string> = {
  no_damage: "#22c55e",
  minor: "#eab308",
  major: "#f97316",
  destroyed: "#ef4444",
};

const LABELS: Record<string, string> = {
  no_damage: "No / minor",
  minor: "Moderate",
  major: "Major",
  destroyed: "Destroyed",
};

export interface DamagePercentages {
  no_damage: number;
  minor: number;
  major: number;
  destroyed: number;
}

const DEFAULT_PERCENTAGES: DamagePercentages = {
  no_damage: 42,
  minor: 28,
  major: 18,
  destroyed: 12,
};

type Props = {
  percentages?: Partial<DamagePercentages>;
};

export default function DamagePercentageIndicators({ percentages: prop }: Props) {
  const pct = { ...DEFAULT_PERCENTAGES, ...prop };
  const total = pct.no_damage + pct.minor + pct.major + pct.destroyed;
  const normalized = total > 0
    ? {
        no_damage: Math.round((pct.no_damage / total) * 100),
        minor: Math.round((pct.minor / total) * 100),
        major: Math.round((pct.major / total) * 100),
        destroyed: Math.round((pct.destroyed / total) * 100),
      }
    : { no_damage: 0, minor: 0, major: 0, destroyed: 0 };

  const entries = (["no_damage", "minor", "major", "destroyed"] as const).map(
    (key) => ({
      key,
      label: LABELS[key],
      color: DAMAGE_COLORS[key],
      value: normalized[key],
    })
  );

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="text-sm font-medium text-zinc-700 shrink-0">
        Distribution
      </span>
      {entries.map(({ key, label, color, value }) => (
        <div key={key} className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-zinc-600 whitespace-nowrap">
            {label}
          </span>
          <span className="text-sm font-semibold text-zinc-900 tabular-nums">
            {value}%
          </span>
        </div>
      ))}
      <div className="w-full max-w-md h-2 flex rounded-full overflow-hidden bg-zinc-100">
        {entries.map(({ key, color, value }) => (
          <div
            key={key}
            className="h-full transition-all duration-300"
            style={{
              width: `${value}%`,
              backgroundColor: color,
            }}
            title={`${LABELS[key]}: ${value}%`}
          />
        ))}
      </div>
    </div>
  );
}
