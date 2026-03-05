import MessageBubble from "./components/MessageBubble";

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col text-white">
      {/* Header panel */}
      <div className="border-b border-gray-700 bg-gray-900">
        <div className="max-w-3xl mx-auto flex items-center gap-4 p-6">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 text-white text-xl">
            🤖
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Disaster Response AI
            </h1>
            <p className="text-gray-400">Geospatial Damage Assessment</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <MessageBubble
            role="ai"
            message="I'm your disaster response AI assistant. I can help you assess damage, analyze geospatial data, and prioritize emergency response. What area would you like me to analyze?"
            time="02:08 PM"
          />
        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-gray-700 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {/* Suggestions */}
          <div className="mb-4 flex flex-wrap gap-3">
            {[
              "Assess damage in downtown area",
              "Show critical zones",
              "Building stability analysis",
              "Infrastructure status",
            ].map((label) => (
              <button
                key={label}
                className="rounded-full border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex items-center gap-3">
            <input
              placeholder="Ask about damage assessment, locations, or infrastructure…"
              className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-4 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              className="h-14 w-14 rounded-xl bg-blue-600 text-white flex items-center justify-center"
              aria-label="Send"
              type="button"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}