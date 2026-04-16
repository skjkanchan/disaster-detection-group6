"use client";

import { useState, useCallback } from "react";
import MessageBubble from "./MessageBubble";

type Message = { role: "ai" | "user"; content: string; time?: string };

const INITIAL_AI_MESSAGE: Message = {
  role: "ai",
  content:  "I'm your disaster response AI assistant. I can help you assess damage, analyze geospatial data, and prioritize emergency response. What area would you like me to analyze?",
  time: undefined,
};


//    "I'm your disaster response AI assistant. I can help you assess damage, analyze geospatial data, and prioritize emergency response. What area would you like me to analyze?",


const SUGGESTIONS = [
  "What's the damage at 501 River Rd?",
  "Damage on Main St",
  "Region North summary",
  "Severity summary",
  "Overall dataset summary",
  "Top affected areas",
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_AI_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || loading) return;

      const userMessage: Message = {
        role: "user",
        content: trimmed,
        time: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const history = [
          ...messages.map((m) => ({
            role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          })),
          { role: "user" as const, content: trimmed },
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        const data = await res.json();

        if (!res.ok) {
          const detail = data.raw
            ? `${data.error}\n\n(Raw: ${data.raw})`
            : (data.error ?? res.statusText);
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: `Error: ${detail}`,
              time: formatTime(new Date()),
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: data.message ?? "No response.",
            time: formatTime(new Date()),
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `Request failed: ${
              err instanceof Error ? err.message : "Unknown error"
            }.`,
            time: formatTime(new Date()),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  return (
    <div className="flex flex-col h-[75vh] min-h-[500px] w-full border border-zinc-200 bg-white shadow-sm rounded-xl">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-4 p-5">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-xl shadow-sm">
            🤖
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 leading-tight">
              Disaster Response AI
            </h2>
            <p className="text-xs font-medium text-zinc-500">
              Geospatial Damage Assessment Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white overflow-y-auto w-full">
        <div className="px-6 py-8 space-y-6">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              message={msg.content}
              time={msg.time}
            />
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white text-sm shadow-sm">
                🤖
              </div>
              <div className="rounded-xl px-4 py-3 bg-zinc-100 text-zinc-500 text-sm">
                Thinking…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions + Input */}
      <div className="border-t border-zinc-200 bg-zinc-50 p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((label) => (
            <button
              key={label}
              onClick={() => sendMessage(label)}
              disabled={loading}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about damage assessment, locations, or infrastructure…"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="h-[46px] w-[46px] flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send"
            type="button"
          >
            <svg
              className="w-5 h-5 ml-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}


// import MessageBubble from "./MessageBubble";

// export default function ChatbotDashboard() {
//   return (
//     <div className="flex flex-col h-[75vh] min-h-[500px] w-full border border-zinc-200 bg-white shadow-sm rounded-xl">
//       {/* Header panel */}
//       <div className="border-b border-zinc-200 bg-zinc-50">
//         <div className="flex items-center gap-4 p-5">
//           <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white text-xl shadow-sm">
//             🤖
//           </div>
//           <div>
//             <h2 className="text-lg font-bold text-zinc-900 leading-tight">
//               Disaster Response AI
//             </h2>
//             <p className="text-xs font-medium text-zinc-500">Geospatial Damage Assessment Assistant</p>
//           </div>
//         </div>
//       </div>

//       {/* Chat area */}
//       <div className="flex-1 bg-white overflow-y-auto w-full">
//         <div className="px-6 py-8">
//           <MessageBubble
//             role="ai"
//             message="I'm your disaster response AI assistant. I can help you assess damage, analyze geospatial data, and prioritize emergency response. What area would you like me to analyze?"
//             time="02:08 PM"
//           />
//         </div>
//       </div>

//       {/* Bottom section */}
//       <div className="border-t border-zinc-200 bg-zinc-50 p-5">
//         {/* Suggestions */}
//         <div className="mb-4 flex flex-wrap gap-2">
//           {[
//             "Assess damage in downtown area",
//             "Show critical zones",
//             "Building stability analysis",
//             "Infrastructure status",
//           ].map((label) => (
//             <button
//               key={label}
//               className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
//               type="button"
//             >
//               {label}
//             </button>
//           ))}
//         </div>

//         {/* Text Field */}
//         <div className="flex items-center gap-3">
//           <input
//             placeholder="Ask about damage assessment, locations, or infrastructure…"
//             className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
//           />
//           <button
//             className="h-[46px] w-[46px] flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm transition-colors"
//             aria-label="Send"
//             type="button"
//           >
//             <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
//             </svg>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
