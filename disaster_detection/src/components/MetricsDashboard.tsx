"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Map,
    CheckCircle,
    AlertOctagon,
    Info,
    Loader2,
    Compass,
    Globe
} from 'lucide-react';

const getBBox = (coords: number[][]) => {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    coords.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });
    return { minLng, maxLng, minLat, maxLat };
};

const pointInBBox = (pt: number[], bbox: any) => {
    return pt[0] >= bbox.minLng && pt[0] <= bbox.maxLng && pt[1] >= bbox.minLat && pt[1] <= bbox.maxLat;
};

export default function MetricsDashboard() {
    const [allBuildings, setAllBuildings] = useState<any[]>([]);
    const [vlmPredictions, setVlmPredictions] = useState<any[]>([]);
    const [tiles, setTiles] = useState<any[]>([]);
    const [selectedTileId, setSelectedTileId] = useState<string>('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                // Fetch real data from AWS through our Next.js API routes
                const [metadataRes, buildingsRes, vlmRes] = await Promise.all([
                    fetch('/api/matthew-metadata'),
                    fetch('/api/matthew-buildings'),
                    fetch('/data/all_predictions.json')
                ]);

                const metadata = await metadataRes.json();
                const buildingsData = await buildingsRes.json();
                const vlmJson = await vlmRes.json();

                if (Array.isArray(metadata)) {
                    setTiles(metadata);
                }

                if (buildingsData.features) {
                    setAllBuildings(buildingsData.features);
                }

                if (Array.isArray(vlmJson)) {
                    const SUBTYPE_MAP: Record<string, string> = {
                        "no damage": "no-damage",
                        no_damage: "no-damage",
                        minor: "minor-damage",
                        major: "major-damage",
                        destroyed: "destroyed",
                    };
                    const features = vlmJson.map((pred: any) => ({
                        properties: {
                            uid: pred.building_uid,
                            subtype: pred.damage_label ? (SUBTYPE_MAP[pred.damage_label.toLowerCase()] ?? "un-classified") : "un-classified"
                        }
                    }));
                    setVlmPredictions(features);
                }
            } catch (err) {
                console.error("Error loading metrics data", err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    // Calculate stats for all tiles up-front for our interactive explorer
    const tileAnalytics = useMemo(() => {
        if (!tiles.length || !allBuildings.length) return [];

        return tiles.map(tile => {
            const bbox = getBBox(tile.coordinates);
            let critical = 0;
            let safe = 0;
            let total = 0;

            allBuildings.forEach(f => {
                const coords = f.geometry?.coordinates?.[0];
                if (coords && coords[0] && pointInBBox(coords[0], bbox)) {
                    total++;
                    const sub = f.properties?.subtype;
                    if (sub === 'destroyed' || sub === 'major-damage') {
                        critical++;
                    } else if (sub === 'minor-damage' || sub === 'no-damage' || sub === 'un-classified') {
                        safe++;
                    }
                }
            });

            return {
                ...tile,
                total,
                critical,
                safe,
                damageRatio: total > 0 ? (critical / total) * 100 : 0
            };
        }).sort((a, b) => b.critical - a.critical); // Sort by highest critical damage first
    }, [tiles, allBuildings]);


    // Filter buildings based on currently selected tile
    const activeBuildings = useMemo(() => {
        if (selectedTileId === 'All') return allBuildings;

        const tile = tiles.find(t => t.id === selectedTileId);
        if (!tile || !tile.coordinates) return allBuildings;

        const bbox = getBBox(tile.coordinates);
        return allBuildings.filter(f => {
            const coords = f.geometry?.coordinates?.[0];
            if (!coords || !coords[0]) return false;
            return pointInBBox(coords[0], bbox);
        });
    }, [selectedTileId, allBuildings, tiles]);

    // Calculate aggregated metrics for the active building array
    const { chartData, criticalDamageCount, safeCount } = useMemo(() => {
        const counts = {
            'No Damage': 0,
            'Minor Damage': 0,
            'Major Damage': 0,
            'Destroyed': 0
        };

        activeBuildings.forEach((f: any) => {
            const sub = f.properties?.subtype;
            if (sub === 'no-damage' || sub === 'un-classified') counts['No Damage']++;
            else if (sub === 'minor-damage') counts['Minor Damage']++;
            else if (sub === 'major-damage') counts['Major Damage']++;
            else if (sub === 'destroyed') counts['Destroyed']++;
        });

        return {
            chartData: [
                { name: 'No Damage', count: counts['No Damage'] },
                { name: 'Minor Damage', count: counts['Minor Damage'] },
                { name: 'Major Damage', count: counts['Major Damage'] },
                { name: 'Destroyed', count: counts['Destroyed'] },
            ],
            criticalDamageCount: counts['Major Damage'] + counts['Destroyed'],
            safeCount: counts['No Damage'] + counts['Minor Damage']
        };
    }, [activeBuildings]);

    // Calculate Confusion Matrix for VLM Evaluation against Ground Truth
    const confusionMatrix = useMemo(() => {
        let tp = 0, fp = 0, tn = 0, fn = 0;

        // Convert to map for fast lookup
        const vlmMap = new globalThis.Map();
        vlmPredictions.forEach((p: any) => {
            if (p.properties?.uid) {
                vlmMap.set(p.properties.uid, p.properties.subtype);
            }
        });

        activeBuildings.forEach((gt: any) => {
            const uid = gt.properties?.uid;
            if (!uid) return;

            const gtSub = gt.properties?.subtype;
            const predSub = vlmMap.get(uid);

            // Assume "Positive" = Major/Destroyed (Critical Damage)
            // "Negative" = No/Minor Damage
            const gtIsCritical = gtSub === 'destroyed' || gtSub === 'major-damage';

            if (predSub) {
                const predIsCritical = predSub === 'destroyed' || predSub === 'major-damage';

                if (gtIsCritical && predIsCritical) tp++;
                else if (!gtIsCritical && predIsCritical) fp++;
                else if (!gtIsCritical && !predIsCritical) tn++;
                else if (gtIsCritical && !predIsCritical) fn++;
            } else {
                // If model didn't predict it, assume Negative
                if (gtIsCritical) fn++;
                else tn++;
            }
        });

        const total = tp + fp + tn + fn;
        const accuracy  = total > 0 ? ((tp + tn) / total) * 100 : 0;
        const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
        const recall    = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
        const f1        = (precision + recall) > 0
          ? (2 * precision * recall) / (precision + recall)
          : 0;

        return { tp, fp, tn, fn, accuracy, precision, recall, f1, total };
    }, [activeBuildings, vlmPredictions]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] h-full space-y-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-zinc-500 font-medium">Connecting to FEMA database...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-zinc-200 pb-4">
                <h2 className="text-xl font-bold text-zinc-900">Damage Assessment Data</h2>
                <p className="text-sm text-zinc-500">FEMA records synced from AWS</p>
            </div>

            {/* Interactive Region Explorer Dashboard */}
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Compass size={20} className="text-indigo-600" />
                    <h3 className="text-sm font-bold text-zinc-900">Interactive Region Explorer</h3>
                    <span className="text-xs text-zinc-500 ml-auto mr-1">Ranked by risk</span>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-4 w-full snap-x hidden-scrollbar" style={{ scrollbarWidth: 'none' }}>
                    {/* Global Overview Card */}
                    <div
                        onClick={() => setSelectedTileId('All')}
                        className={`snap-start min-w-[220px] shrink-0 cursor-pointer rounded-xl p-4 border transition-all ${selectedTileId === 'All' ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/50' : 'border-zinc-200 bg-white hover:border-indigo-300 shadow-sm'}`}
                    >
                        <div className="w-full h-28 mb-4 rounded-lg bg-indigo-100 flex items-center justify-center border border-indigo-200">
                            <Globe size={48} className="text-indigo-400 opacity-60" />
                        </div>
                        <h4 className="font-bold text-zinc-900 text-[15px]">Global Overview</h4>
                        <p className="text-xs text-zinc-500 mt-1 mb-4">All {tiles.length} tracked regions</p>
                        <div className="flex items-end gap-1 mb-2">
                            <span className="text-xl font-bold text-indigo-700">{allBuildings.length.toLocaleString()}</span>
                            <span className="text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Total</span>
                        </div>
                        <div className="w-full h-1.5 bg-indigo-200 rounded-full overflow-hidden flex">
                            <div className="bg-indigo-600 h-full w-full"></div>
                        </div>
                    </div>

                    {/* Highly dynamic mini-sector cards */}
                    {tileAnalytics.map(stat => (
                        <div
                            key={stat.id}
                            onClick={() => setSelectedTileId(stat.id)}
                            className={`snap-start min-w-[220px] shrink-0 cursor-pointer rounded-xl p-4 border transition-all ${selectedTileId === stat.id ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/50' : 'border-zinc-200 bg-zinc-50 hover:border-indigo-300 hover:bg-white shadow-sm'}`}
                        >
                            {/* Visual Thumbnail */}
                            <div className="relative w-full h-28 mb-4 rounded-lg overflow-hidden bg-zinc-200 border border-zinc-200">
                                <img
                                    src={`/api/aws-image?id=${stat.id}&type=post`}
                                    alt={`Zone ${stat.id}`}
                                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                />
                                {stat.critical > 0 && (
                                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md shadow-sm">
                                        High Risk
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-zinc-900 text-[15px]">Zone • {stat.id.replace(/^0+/, '') || '0'}</h4>
                            </div>

                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-end gap-1">
                                    <span className="text-xl font-bold text-zinc-800">{stat.total.toLocaleString()}</span>
                                    <span className="text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Bldgs</span>
                                </div>
                            </div>

                            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden flex">
                                {stat.total > 0 ? (
                                    <>
                                        <div style={{ width: `${stat.damageRatio}%` }} className="bg-red-500 h-full transition-all"></div>
                                        <div style={{ width: `${100 - stat.damageRatio}%` }} className="bg-emerald-400 h-full transition-all"></div>
                                    </>
                                ) : (
                                    <div className="bg-zinc-300 h-full w-full"></div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Selected Viewport', value: selectedTileId === 'All' ? 'Global' : `Zone ${selectedTileId.replace(/^0+/, '')}`, icon: Map, trend: 'Current scope', trendPositive: true },
                    { label: 'Buildings Recorded', value: activeBuildings.length.toLocaleString(), icon: CheckCircle, trend: 'FEMA entries', trendPositive: true },
                    { label: 'Critical Damage', value: criticalDamageCount.toLocaleString(), icon: AlertOctagon, trend: 'Major or destroyed', trendPositive: false },
                    { label: 'Minor / No Damage', value: safeCount.toLocaleString(), icon: Info, trend: 'Safe or repairable', trendPositive: true },
                ].map((metric, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-center text-zinc-500">
                            <span className="text-sm font-medium">{metric.label}</span>
                            <metric.icon size={18} className={!metric.trendPositive && metric.label === 'Critical Damage' ? 'text-red-500' : ''} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-zinc-900">{metric.value}</span>
                        </div>
                        <span className={`text-xs font-semibold ${metric.trendPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                            {metric.trend}
                        </span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Large Satellite Image Preview */}
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col min-h-[400px] lg:min-h-[500px]">
                    <h3 className="text-sm font-bold text-zinc-900 mb-4">
                        {selectedTileId === 'All' ? 'Global Viewport Overview' : `High-Resolution Satellite Scan (Zone ${selectedTileId.replace(/^0+/, '')})`}
                    </h3>
                    <div className="w-full flex-1 rounded-lg overflow-hidden bg-zinc-100 flex items-center justify-center border border-zinc-200 relative">
                        {selectedTileId === 'All' ? (
                            <div className="flex flex-col items-center opacity-60">
                                <Globe size={80} className="text-indigo-400 mb-4" />
                                <p className="text-zinc-500 font-medium">Select a zone above to inspect imagery</p>
                            </div>
                        ) : (
                            <img
                                src={`/api/aws-image?id=${selectedTileId}&type=post`}
                                alt={`Zone ${selectedTileId} Detailed View`}
                                className="object-cover w-full h-full"
                            />
                        )}
                    </div>
                </div>

                {/* Damage Distribution Chart */}
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col min-h-[400px] lg:min-h-[500px]">
                    <h3 className="text-sm font-bold text-zinc-900 mb-4">Damage Distribution Breakdown</h3>
                    <div className="w-full text-xs flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f4f4f5' }}
                                    formatter={(value: number | undefined) => [value ?? 0, 'Buildings']}
                                />
                                <Bar dataKey="count" name="Building Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* VLM Evaluation Section */}
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col mt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900">VLM Model Evaluation (Confusion Matrix)</h3>
                        <p className="text-xs text-zinc-500 mt-1">Comparing VLM Predictions vs FEMA Ground Truth (Critical Damage)</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* Confusion Matrix Grid */}
                    <div className="grid grid-cols-2 gap-3 text-center w-full md:w-80">
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 flex flex-col justify-center shadow-sm">
                            <div className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">True Positive</div>
                            <div className="text-3xl font-black text-emerald-600">{confusionMatrix.tp}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex flex-col justify-center shadow-sm">
                            <div className="text-xs text-red-700 font-bold uppercase tracking-wider mb-1">False Positive</div>
                            <div className="text-3xl font-black text-red-600">{confusionMatrix.fp}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex flex-col justify-center shadow-sm">
                            <div className="text-xs text-red-700 font-bold uppercase tracking-wider mb-1">False Negative</div>
                            <div className="text-3xl font-black text-red-600">{confusionMatrix.fn}</div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 flex flex-col justify-center shadow-sm">
                            <div className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">True Negative</div>
                            <div className="text-3xl font-black text-emerald-600">{confusionMatrix.tn}</div>
                        </div>
                    </div>

                    {/* Accuracy Metrics Grid */}
                    <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                        {[
                            { label: 'Accuracy', value: confusionMatrix.accuracy, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', desc: '(TP+TN) / Total' },
                            { label: 'Precision', value: confusionMatrix.precision, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', desc: 'TP / (TP+FP)' },
                            { label: 'Recall', value: confusionMatrix.recall, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'TP / (TP+FN)' },
                            { label: 'F1 Score', value: confusionMatrix.f1, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: '2·P·R / (P+R)' },
                        ].map(m => (
                            <div key={m.label} className={`flex flex-col justify-center items-center p-4 ${m.bg} rounded-xl border ${m.border}`}>
                                <div className={`text-3xl font-black ${m.color}`}>{m.value.toFixed(1)}%</div>
                                <div className="text-xs font-bold text-zinc-700 mt-1 uppercase tracking-wide">{m.label}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">{m.desc}</div>
                            </div>
                        ))}
                        <div className="col-span-2 text-center text-[11px] text-zinc-400 pt-1">
                            Based on {confusionMatrix.total.toLocaleString()} buildings · Positive = Major/Destroyed
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
