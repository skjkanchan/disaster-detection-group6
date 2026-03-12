type MessageBubbleProps = {
  message: string
  role: "ai" | "user"
  time?: string
}

export default function MessageBubble({ message, role, time }: MessageBubbleProps) {
  const isAI = role === "ai"

  return (
    <div className={`flex items-start gap-4 ${isAI ? "" : "flex-row-reverse"}`}>
      
      {/* Avatar */}
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white">
        {isAI ? "🤖" : "🧑"}
      </div>

      {/* Bubble */}
      <div>
        <div
          className={`rounded-2xl px-6 py-4 max-w-[620px] leading-relaxed
          ${isAI ? "bg-gray-500 text-white" : "bg-blue-600 text-white"}`}
        >
          {message}
        </div>

        {time && (
          <p className="text-sm text-gray-400 mt-1">{time}</p>
        )}
      </div>

    </div>
  )
}