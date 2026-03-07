"use client";

import { useState, useCallback } from "react";
import MessageBubble from "./components/MessageBubble";

type Message = { role: "ai" | "user"; content: string; time?: string };

const INITIAL_AI_MESSAGE: Message = {
  role: "ai",
  content:
    "I'm your disaster response AI assistant. I can help you assess damage, analyze geospatial data, and prioritize emergency response. What area would you like me to analyze?",
  time: formatTime(new Date()),
};

const SUGGESTIONS = [
  "Assess damage in downtown area",
  "Show critical zones",
  "Building stability analysis",
  "Infrastructure status",
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
          const detail = data.raw ? `${data.error}\n\n(Raw: ${data.raw})` : (data.error ?? res.statusText);
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
            content: `Request failed: ${err instanceof Error ? err.message : "Unknown error"}.`,
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
    <div className="min-h-screen bg-gray-900 flex flex-col text-white">
      {/* Header */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              message={msg.content}
              time={msg.time}
            />
          ))}
          {loading && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white">
                🤖
              </div>
              <div className="rounded-2xl px-6 py-4 bg-gray-500 text-gray-300">
                Thinking…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions + Input */}
      <div className="border-t border-gray-700 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="mb-4 flex flex-wrap gap-3">
            {SUGGESTIONS.map((label) => (
              <button
                key={label}
                onClick={() => sendMessage(label)}
                disabled={loading}
                className="rounded-full border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-4 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="h-14 w-14 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500"
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
