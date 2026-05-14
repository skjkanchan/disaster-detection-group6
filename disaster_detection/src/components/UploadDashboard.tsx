"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { UploadCloud, X, ImageIcon, Loader2, AlertTriangle, CheckCircle2, ShieldAlert, Flame } from "lucide-react";

type DamageLabel = "no damage" | "minor" | "major" | "destroyed";

type Result = {
  damage_label: DamageLabel;
  confidence: number;
  explanation: string;
};

const DAMAGE_CONFIG: Record<DamageLabel, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; barColor: string }> = {
  "no damage":  { label: "No Damage",  color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-300", icon: <CheckCircle2 size={22} className="text-emerald-600" />, barColor: "bg-emerald-500" },
  "minor":      { label: "Minor Damage", color: "text-yellow-700", bg: "bg-yellow-50",  border: "border-yellow-300", icon: <ShieldAlert  size={22} className="text-yellow-600" />, barColor: "bg-yellow-400" },
  "major":      { label: "Major Damage", color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-300", icon: <AlertTriangle size={22} className="text-orange-600" />, barColor: "bg-orange-500" },
  "destroyed":  { label: "Destroyed",   color: "text-red-700",    bg: "bg-red-50",     border: "border-red-300",    icon: <Flame         size={22} className="text-red-600" />,    barColor: "bg-red-500" },
};

const SEVERITY_RANK: Record<DamageLabel, number> = { "no damage": 0, minor: 1, major: 2, destroyed: 3 };

function DropZone({
  label,
  sublabel,
  file,
  preview,
  onFile,
  onClear,
  accent,
}: {
  label: string;
  sublabel: string;
  file: File | null;
  preview: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
  accent: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f && f.type.startsWith("image/")) onFile(f);
    },
    [onFile]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${accent}`}>{label}</span>
        <span className="text-xs text-zinc-500">{sublabel}</span>
      </div>

      <div
        onClick={() => !preview && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex-1 min-h-[280px] rounded-xl border-2 transition-all duration-200 overflow-hidden
          ${preview
            ? "border-zinc-200 cursor-default"
            : dragging
              ? "border-indigo-400 bg-indigo-50 scale-[1.01] cursor-copy"
              : "border-dashed border-zinc-300 bg-zinc-50 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer"
          }`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow rounded-full p-1.5 text-zinc-600 hover:text-red-500 transition-colors"
              title="Remove image"
            >
              <X size={14} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
              <p className="text-white text-xs font-medium truncate">{file?.name}</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dragging ? "bg-indigo-100" : "bg-zinc-100"}`}>
              {dragging
                ? <UploadCloud size={28} className="text-indigo-500" />
                : <ImageIcon size={28} className="text-zinc-400" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700">
                {dragging ? "Drop image here" : "Drop or click to upload"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">PNG, JPG, WEBP</p>
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </div>
    </div>
  );
}

export default function UploadDashboard() {
  const [preFile, setPreFile]     = useState<File | null>(null);
  const [postFile, setPostFile]   = useState<File | null>(null);
  const [prePreview, setPrePreview]   = useState<string | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<Result | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const handleFile = (which: "pre" | "post") => (f: File) => {
    const url = URL.createObjectURL(f);
    if (which === "pre") { setPreFile(f); setPrePreview(url); }
    else                 { setPostFile(f); setPostPreview(url); }
    setResult(null);
    setError(null);
  };

  const clearFile = (which: "pre" | "post") => () => {
    if (which === "pre")  { setPreFile(null);  setPrePreview(null); }
    else                  { setPostFile(null); setPostPreview(null); }
    setResult(null);
  };

  const analyze = async () => {
    if (!preFile || !postFile) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const form = new FormData();
    form.append("preImage", preFile);
    form.append("postImage", postFile);

    try {
      const res = await fetch("/api/analyze-pair", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed. Please try again.");
      } else {
        setResult(data as Result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const ready = !!preFile && !!postFile;
  const cfg = result ? DAMAGE_CONFIG[result.damage_label] : null;

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-5">
        <h2 className="text-xl font-bold text-zinc-900">VLM Damage Evaluation</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Upload a pre-disaster and post-disaster image pair. The Vision-Language Model will compare
          them and classify the building damage level.
        </p>
      </div>

      {/* Upload Zones */}
      <div className="flex flex-col md:flex-row gap-6">
        <DropZone
          label="Pre-Disaster"
          sublabel="Before the event"
          file={preFile}
          preview={prePreview}
          onFile={handleFile("pre")}
          onClear={clearFile("pre")}
          accent="bg-blue-100 text-blue-700"
        />

        {/* Divider */}
        <div className="hidden md:flex flex-col items-center justify-center gap-2 shrink-0">
          <div className="w-px flex-1 bg-zinc-200" />
          <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 text-xs font-bold">
            VS
          </div>
          <div className="w-px flex-1 bg-zinc-200" />
        </div>

        <DropZone
          label="Post-Disaster"
          sublabel="After the event"
          file={postFile}
          preview={postPreview}
          onFile={handleFile("post")}
          onClear={clearFile("post")}
          accent="bg-red-100 text-red-700"
        />
      </div>

      {/* Analyze Button */}
      <button
        onClick={analyze}
        disabled={!ready || loading}
        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-zinc-300 disabled:text-zinc-500"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Analyzing image pair…
          </>
        ) : (
          <>
            <UploadCloud size={18} />
            {ready ? "Analyze Damage Pair" : "Upload both images to continue"}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && cfg && (
        <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-6 space-y-5`}>
          {/* Title row */}
          <div className="flex items-center gap-3">
            {cfg.icon}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">VLM Assessment Result</p>
              <h3 className={`text-2xl font-black ${cfg.color}`}>{cfg.label}</h3>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-zinc-500 font-medium">Confidence</p>
              <p className={`text-2xl font-black ${cfg.color}`}>{(result.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          {/* Severity bar */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
              <span>No Damage</span>
              <span>Minor</span>
              <span>Major</span>
              <span>Destroyed</span>
            </div>
            <div className="relative h-3 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${cfg.barColor}`}
                style={{ width: `${((SEVERITY_RANK[result.damage_label] + 1) / 4) * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow transition-all duration-700"
                style={{
                  left: `calc(${((SEVERITY_RANK[result.damage_label] + 1) / 4) * 100}% - 8px)`,
                  borderColor: cfg.barColor.replace("bg-", "#").replace("-500", ""),
                }}
              />
            </div>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5 font-medium">
              <span>Model Confidence</span>
              <span>{(result.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Explanation */}
          {result.explanation && (
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Analysis</p>
              <p className="text-sm text-zinc-700 leading-relaxed">{result.explanation}</p>
            </div>
          )}

          {/* Image comparison row */}
          {prePreview && postPreview && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-1.5 uppercase tracking-wider">Pre-Disaster</p>
                <img src={prePreview} alt="Pre" className="w-full h-36 object-cover rounded-lg border border-zinc-200" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1.5 uppercase tracking-wider">Post-Disaster</p>
                <img src={postPreview} alt="Post" className="w-full h-36 object-cover rounded-lg border border-zinc-200" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
