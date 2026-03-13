import { useState, useEffect, useRef } from "react";

const PLACEHOLDERS = [
  "make it more Indian this week",
  "I want more vegetables and less chicken",
  "add more healthy fats",
  "I'm skipping gym this week, reduce calories by 200",
  "swap chicken for more eggs and dal",
];

export default function AICommandBar({
  onSubmit,         // fn(input, intent) — called when user submits
  isThinking,
  apiKeyPresent,
  onOpenSettings,
}) {
  const [input, setInput] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef(null);

  // Cycle placeholders every 4s
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isThinking || !apiKeyPresent) return;
    onSubmit(trimmed);
    setInput("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="mb-4">
      <div
        className={`flex items-center gap-2 bg-white border rounded-xl shadow-sm px-4 py-3 transition-all ${
          apiKeyPresent
            ? "border-indigo-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"
            : "border-gray-200 opacity-70"
        }`}
      >
        {/* Spark icon */}
        <span className="text-indigo-400 flex-shrink-0 text-base">✦</span>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={!apiKeyPresent || isThinking}
          placeholder={
            apiKeyPresent
              ? `Ask Kimi: ${PLACEHOLDERS[placeholderIdx]}`
              : "Add API key in settings to enable AI features"
          }
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed"
        />

        {/* Right side */}
        {apiKeyPresent ? (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isThinking}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send"
          >
            {isThinking ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        ) : (
          <button
            onClick={onOpenSettings}
            className="flex-shrink-0 text-xs text-indigo-600 font-medium hover:underline whitespace-nowrap"
          >
            Add key
          </button>
        )}
      </div>

      {/* Hint row */}
      <p className="text-xs text-gray-400 mt-1.5 px-1">
        {apiKeyPresent
          ? "Powered by Kimi K2.5 · Commands rewrite your list · Questions get a chat answer"
          : "AI features require an NVIDIA API key"}
      </p>
    </div>
  );
}
