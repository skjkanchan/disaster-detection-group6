import MessageBubble from "./MessageBubble";

export default function ChatbotDashboard() {
  return (
    <div className="flex flex-col h-[75vh] min-h-[500px] w-full border border-zinc-200 bg-white shadow-sm rounded-xl">
      {/* Header panel */}
      <div className="border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-4 p-5">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-xl shadow-sm">
            🤖
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 leading-tight">
              Disaster Response AI
            </h2>
            <p className="text-xs font-medium text-zinc-500">Geospatial Damage Assessment Assistant</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white overflow-y-auto w-full">
        <div className="px-6 py-8">
          <MessageBubble
            role="ai"
            message="I'm your disaster response AI assistant. I can help you assess damage, analyze geospatial data, and prioritize emergency response. What area would you like me to analyze?"
            time="02:08 PM"
          />
        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-zinc-200 bg-zinc-50 p-5">
        {/* Suggestions */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            "Assess damage in downtown area",
            "Show critical zones",
            "Building stability analysis",
            "Infrastructure status",
          ].map((label) => (
            <button
              key={label}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Text Field */}
        <div className="flex items-center gap-3">
          <input
            placeholder="Ask about damage assessment, locations, or infrastructure…"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          <button
            className="h-[46px] w-[46px] flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm transition-colors"
            aria-label="Send"
            type="button"
          >
            <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
