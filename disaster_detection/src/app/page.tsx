"use client";

import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import GeospatialDashboard from "@/components/GeospatialDashboard";
import MetricsDashboard from "@/components/MetricsDashboard";
import UploadDashboard from "@/components/UploadDashboard";
import ChatbotDashboard from "@/components/ChatbotDashboard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'map' | 'evaluation' | 'upload' | 'chatbot'>('map');

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <main className="mx-auto w-full px-4 lg:px-8 space-y-6">
        <DashboardHeader />


        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 mb-6">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'map'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
          >
            Geospatial Dashboard
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'evaluation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
          >
            Evaluation Metrics
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chatbot'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
          >
            AI Chatbot
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
          >
            Image Upload
          </button>
        </div>

        <section className="bg-white rounded-xl border border-zinc-200 p-4 md:p-6 shadow-sm w-full min-h-[80vh]">
          {activeTab === 'map' && <GeospatialDashboard />}
          {activeTab === 'evaluation' && <MetricsDashboard />}
          {activeTab === 'chatbot' && <ChatbotDashboard />}
          {activeTab === 'upload' && <UploadDashboard />}

        </section>
      </main>
    </div>
  );
}
