'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  ImageIcon,
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  XCircle,
  ChevronRight,
  Info,
  Zap,
} from 'lucide-react';

type DamageLevel = 'no-damage' | 'minor-damage' | 'major-damage' | 'destroyed';

interface EvaluationResult {
  damage_level: DamageLevel;
  confidence: number;
  summary: string;
  indicators: string[];
  reasoning: string;
}

const DAMAGE_CONFIG: Record<
  DamageLevel,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  'no-damage': {
    label: 'No Damage',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    icon: CheckCircle,
  },
  'minor-damage': {
    label: 'Minor Damage',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    icon: AlertTriangle,
  },
  'major-damage': {
    label: 'Major Damage',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    icon: AlertOctagon,
  },
  destroyed: {
    label: 'Destroyed',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-300',
    icon: XCircle,
  },
};

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? 'bg-emerald-500' : pct >= 55 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-zinc-600">
        <span>Model Confidence</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface ImageDropZoneProps {
  label: string;
  sublabel: string;
  file: File | null;
  preview: string | null;
  onFileChange: (file: File, preview: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

function ImageDropZone({
  label,
  sublabel,
  file,
  preview,
  onFileChange,
  onClear,
  disabled,
}: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (selected: File) => {
      const reader = new FileReader();
      reader.onload = (e) => onFileChange(selected, e.target?.result as string);
      reader.readAsDataURL(selected);
    },
    [onFileChange]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('image/')) handleFile(dropped);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-zinc-800">{label}</span>
        <span className="text-xs text-zinc-400">{sublabel}</span>
      </div>

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-100 group">
          <img
            src={preview}
            alt={label}
            className="w-full h-56 object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          {!disabled && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow text-zinc-600 hover:text-red-500 transition-colors"
              title="Remove image"
            >
              <XCircle size={16} />
            </button>
          )}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-xs font-medium truncate">{file?.name}</p>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center h-56 rounded-xl border-2 border-dashed transition-all cursor-pointer
            ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-indigo-400 hover:bg-indigo-50/40'}
            ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-zinc-300 bg-zinc-50'}`}
        >
          <div className={`p-3 rounded-full mb-3 ${dragging ? 'bg-indigo-100' : 'bg-zinc-100'}`}>
            <ImageIcon size={28} className={dragging ? 'text-indigo-500' : 'text-zinc-400'} />
          </div>
          <p className="text-sm font-medium text-zinc-600">
            {dragging ? 'Drop image here' : 'Click or drag to upload'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">PNG, JPG, WEBP</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function VLMEvaluationDashboard() {
  const [preFile, setPreFile] = useState<File | null>(null);
  const [prePreview, setPrePreview] = useState<string | null>(null);
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEvaluate = preFile && postFile && !loading;

  const handleEvaluate = async () => {
    if (!preFile || !postFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('pre_image', preFile);
    formData.append('post_image', postFile);

    try {
      const res = await fetch('/api/vlm-evaluate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Evaluation failed. Please try again.');
      } else {
        setResult(data as EvaluationResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreFile(null);
    setPrePreview(null);
    setPostFile(null);
    setPostPreview(null);
    setResult(null);
    setError(null);
  };

  const cfg = result ? DAMAGE_CONFIG[result.damage_level] : null;
  const DamageIcon = cfg?.icon;

  return (
    <div className="p-4 md:p-8 w-full space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-indigo-600" />
          <h2 className="text-xl font-bold text-zinc-900">VLM Damage Evaluation</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Upload a pre- and post-disaster image pair. GPT-4o will analyze both images and
          classify the structural damage level.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageDropZone
            label="Pre-Disaster Image"
            sublabel="(before event)"
            file={preFile}
            preview={prePreview}
            onFileChange={(f, p) => { setPreFile(f); setPrePreview(p); setResult(null); setError(null); }}
            onClear={() => { setPreFile(null); setPrePreview(null); setResult(null); setError(null); }}
            disabled={loading}
          />
          <ImageDropZone
            label="Post-Disaster Image"
            sublabel="(after event)"
            file={postFile}
            preview={postPreview}
            onFileChange={(f, p) => { setPostFile(f); setPostPreview(p); setResult(null); setError(null); }}
            onClear={() => { setPostFile(null); setPostPreview(null); setResult(null); setError(null); }}
            disabled={loading}
          />
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleEvaluate}
            disabled={!canEvaluate}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm
              ${canEvaluate
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Evaluate Damage
              </>
            )}
          </button>

          {(preFile || postFile || result) && !loading && (
            <button
              onClick={handleReset}
              className="px-4 py-3 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              Reset
            </button>
          )}

          {!preFile && !postFile && (
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <Info size={13} />
              Upload both images to enable evaluation
            </p>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 size={40} className="animate-spin text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-zinc-800">GPT-4o is analyzing your images</p>
            <p className="text-sm text-zinc-500 mt-1">
              Comparing pre/post imagery and assessing structural damage…
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <XCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Evaluation Failed</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && cfg && DamageIcon && !loading && (
        <div className="space-y-4 animate-in fade-in duration-500">
          {/* Damage Level Badge */}
          <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`flex items-center gap-3 flex-1`}>
                <div className={`p-2.5 rounded-lg bg-white/60 border ${cfg.border}`}>
                  <DamageIcon size={28} className={cfg.color} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">
                    Damage Assessment Result
                  </p>
                  <p className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</p>
                </div>
              </div>
              <div className="sm:w-56">
                <ConfidenceMeter value={result.confidence} />
              </div>
            </div>
          </div>

          {/* Summary & Image Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Summary */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900">Assessment Summary</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">{result.summary}</p>

              {result.indicators && result.indicators.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Key Indicators Observed
                  </p>
                  <ul className="space-y-1.5">
                    {result.indicators.map((ind, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                        <ChevronRight size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                        {ind}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Side-by-side image comparison */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-zinc-900 mb-3">Image Comparison</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Pre-Disaster
                  </p>
                  <div className="rounded-lg overflow-hidden border border-zinc-200 h-40">
                    <img src={prePreview!} alt="Pre-disaster" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Post-Disaster
                  </p>
                  <div className={`rounded-lg overflow-hidden border ${cfg.border} h-40`}>
                    <img src={postPreview!} alt="Post-disaster" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Reasoning */}
          {result.reasoning && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-zinc-900 mb-2">Detailed Reasoning</h3>
              <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                {result.reasoning}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
