"use client";

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    Map,
    Activity,
    CheckCircle,
    AlertTriangle,
} from 'lucide-react';

const mockPerformanceData = [
    { name: 'No Damage', vlmPredictions: 8120, jsonLabels: 9005 },
    { name: 'Minor Damage', vlmPredictions: 2430, jsonLabels: 2012 },
    { name: 'Major Damage', vlmPredictions: 1420, jsonLabels: 1650 },
    { name: 'Destroyed', vlmPredictions: 1390, jsonLabels: 1272 },
];

export default function MetricsDashboard() {
    return (
        <div className="space-y-6">
            <div className="border-b border-zinc-200 pb-4">
                <h2 className="text-xl font-bold text-zinc-900">Evaluation Metrics</h2>
                <p className="text-sm text-zinc-500">Model predictions vs FEMA ground truth labels</p>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Overall Accuracy', value: '82.4%', icon: Activity, trend: '+2.1%', trendPositive: true },
                    { label: 'Buildings Evaluated', value: '13,939', icon: Map, trend: 'Across 446 Images', trendPositive: true },
                    { label: 'False Alarms', value: '3.1%', icon: AlertTriangle, trend: '-0.5%', trendPositive: true },
                    { label: 'Detection Speed', value: '1.2s', icon: CheckCircle, trend: 'Per image', trendPositive: true },
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

            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm w-full flex-1 min-h-[500px] flex flex-col">
                <h3 className="text-sm font-bold text-zinc-900 mb-4">VLM Predictions vs JSON Data Labels</h3>
                <div className="w-full text-xs h-[400px]">
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
                            <Bar dataKey="vlmPredictions" name="VLM Predictions" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="jsonLabels" name="JSON Data Labels" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
