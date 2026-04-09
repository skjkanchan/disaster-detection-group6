type MessageBubbleProps = {
  message: string
  role: "ai" | "user"
  time?: string
  image?: string
}

export default function MessageBubble({ message, role, time, image }: MessageBubbleProps) {
  const isAI = role === "ai"

  return (
    <div className={`flex items-start gap-4 mb-6 ${isAI ? "" : "flex-row-reverse"}`}>
      
      {/* Avatar */}
      <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full shadow-sm text-sm ${isAI ? "bg-indigo-100 ring-2 ring-indigo-50" : "bg-zinc-100 ring-2 ring-zinc-50"}`}>
        {isAI ? "🤖" : "🧑"}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col ${isAI ? "items-start" : "items-end"}`}>
        <div
          className={`rounded-2xl px-5 py-3.5 max-w-[500px] text-sm leading-relaxed shadow-sm
          ${isAI ? "bg-zinc-100 text-zinc-800 rounded-tl-sm" : "bg-indigo-600 text-white rounded-tr-sm"}`}
        >
          {message}
          {image && (
            <img src={image} alt="Attached Map Snapshot" className="mt-2 rounded-lg max-w-full h-auto max-h-[200px] object-cover border border-white/20 shadow-sm" />
          )}
        </div>

        {time && (
          <p className="text-[10px] font-bold text-zinc-400 mt-1.5 px-1 uppercase tracking-wider">{time}</p>
        )}
      </div>

    </div>
  )
}
