"use client";

import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    Download,
    Map,
    Activity,
    CheckCircle,
    AlertTriangle,
    HelpCircle,
    FileText
} from 'lucide-react';

const mockPerformanceData = [
    { name: 'Undamaged', accuracy: 95, recall: 97, precision: 94 },
    { name: 'Minor', accuracy: 82, recall: 78, precision: 85 },
    { name: 'Major', accuracy: 88, recall: 85, precision: 90 },
    { name: 'Destroyed', accuracy: 92, recall: 96, precision: 89 },
];

const mockConfusionMatrix = [
    [1200, 45, 12, 0],   // Undamaged
    [30, 400, 50, 10],   // Minor
    [5, 40, 250, 35],    // Major
    [0, 5, 20, 180]      // Destroyed
];
const classes = ['Undamaged', 'Minor', 'Major', 'Destroyed'];

export default function MetricsDashboard() {
    const [showGroundTruth, setShowGroundTruth] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900">Evaluation Metrics</h2>
                    <p className="text-sm text-zinc-500">Model predictions vs FEMA ground truth labels</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                        <Download size={16} />
                        Export CSV
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors">
                        <FileText size={16} />
                        Generate PDF
                    </button>
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Overall Accuracy', value: '89.4%', icon: Activity, trend: '+2.1%', trendPositive: true },
                    { label: 'Precision (Macro)', value: '89.5%', icon: CheckCircle, trend: '+1.4%', trendPositive: true },
                    { label: 'Recall (Macro)', value: '89.0%', icon: AlertTriangle, trend: '-0.5%', trendPositive: false },
                    { label: 'Evaluated Samples', value: '2,242', icon: Map, trend: '+142', trendPositive: true },
                ].map((metric, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-center text-zinc-500">
                            <span className="text-sm font-medium">{metric.label}</span>
                            <metric.icon size={18} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-zinc-900">{metric.value}</span>
                            <span className={`text-xs font-semibold ${metric.trendPositive ? 'text-green-600' : 'text-red-500'}`}>
                                {metric.trend}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Charts */}
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-4">Accuracy & Recall by Class</h3>
                    <div className="h-64 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f4f4f5' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                                <Bar dataKey="accuracy" name="Accuracy (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="recall" name="Recall (%)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Confusion Matrix */}
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-zinc-900">Confusion Matrix</h3>
                        <span className="text-xs text-zinc-400 flex items-center gap-1 cursor-help" title="Rows are actual labels, columns are predicted labels.">
                            <HelpCircle size={14} /> Guide
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-max">
                            <div className="grid grid-cols-5 gap-1 mb-1">
                                <div className="text-xs text-zinc-500 font-medium flex items-end justify-end pr-2 pb-2">Actual \ Pred</div>
                                {classes.map(c => (
                                    <div key={c} className="text-xs text-zinc-600 font-medium text-center truncate">{c}</div>
                                ))}
                            </div>

                            {classes.map((actualClass, i) => (
                                <div key={actualClass} className="grid grid-cols-5 gap-1 mb-1">
                                    <div className="text-xs text-zinc-600 font-medium flex items-center justify-end pr-2 h-10 truncate">
                                        {actualClass}
                                    </div>
                                    {classes.map((predictedClass, j) => {
                                        const val = mockConfusionMatrix[i][j];
                                        const isDiagonal = i === j;
                                        // simple color scaling
                                        const intensity = isDiagonal ? Math.min(100, (val / 1200) * 100) : Math.min(100, (val / 200) * 100);
                                        const bgColor = isDiagonal
                                            ? `rgba(79, 70, 229, ${Math.max(0.1, intensity / 100)})`
                                            : val > 0 ? `rgba(239, 68, 68, ${Math.max(0.1, intensity / 100)})` : '#f4f4f5';
                                        const textColor = (isDiagonal && intensity > 50) || (!isDiagonal && intensity > 50) ? 'text-white' : 'text-zinc-700';

                                        return (
                                            <div
                                                key={predictedClass}
                                                className={`h-10 flex items-center justify-center rounded-md text-sm font-medium ${textColor} transition-colors hover:ring-2 hover:ring-indigo-400 cursor-default`}
                                                style={{ backgroundColor: bgColor }}
                                                title={`Actual: ${actualClass}, Predicted: ${predictedClass} - Count: ${val}`}
                                            >
                                                {val}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Toggle & Data Table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
                    <h3 className="text-sm font-bold text-zinc-900">Recent Evaluation Results</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-zinc-600">Map Overlay:</span>
                        <button
                            onClick={() => setShowGroundTruth(!showGroundTruth)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showGroundTruth ? 'bg-indigo-600' : 'bg-zinc-300'}`}
                            aria-label="Toggle ground truth vs predictions overlay"
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showGroundTruth ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-xs font-semibold text-zinc-600 w-24">
                            {showGroundTruth ? 'FEMA Labels' : 'Predictions'}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                            <tr>
                                <th className="px-6 py-3">Location ID</th>
                                <th className="px-6 py-3">Predicted Class</th>
                                <th className="px-6 py-3">FEMA Label</th>
                                <th className="px-6 py-3">Confidence</th>
                                <th className="px-6 py-3">Match</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {[
                                { id: 'LOC-7829', pred: 'Destroyed', fema: 'Destroyed', conf: '94%', match: true },
                                { id: 'LOC-7830', pred: 'Major', fema: 'Minor', conf: '72%', match: false },
                                { id: 'LOC-7831', pred: 'Undamaged', fema: 'Undamaged', conf: '98%', match: true },
                                { id: 'LOC-7832', pred: 'Minor', fema: 'Minor', conf: '85%', match: true },
                                { id: 'LOC-7833', pred: 'Major', fema: 'Major', conf: '88%', match: true },
                            ].map((row, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-zinc-900">{row.id}</td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                      ${row.pred === 'Destroyed' ? 'bg-red-50 text-red-700 border-red-200' :
                                                row.pred === 'Major' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    row.pred === 'Minor' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        'bg-green-50 text-green-700 border-green-200'}`}
                                        >
                                            {row.pred}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                      ${row.fema === 'Destroyed' ? 'bg-red-50 text-red-700 border-red-200' :
                                                row.fema === 'Major' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    row.fema === 'Minor' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        'bg-green-50 text-green-700 border-green-200'}`}
                                        >
                                            {row.fema}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-zinc-500">{row.conf}</td>
                                    <td className="px-6 py-3">
                                        {row.match ?
                                            <span className="text-emerald-600 flex items-center gap-1.5 font-medium"><CheckCircle size={14} /> Yes</span> :
                                            <span className="text-red-500 flex items-center gap-1.5 font-medium"><AlertTriangle size={14} /> No</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
