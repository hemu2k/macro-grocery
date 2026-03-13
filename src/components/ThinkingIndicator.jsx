import { useState, useEffect } from "react";

export default function ThinkingIndicator({ isThinking }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isThinking) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isThinking]);

  if (!isThinking) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
      </span>
      <span className="font-medium">
        ✦ Kimi is thinking
        {elapsed >= 3 ? `... (${elapsed}s)` : "..."}
      </span>
      <span className="text-xs text-indigo-400 ml-auto">thinking mode on</span>
    </div>
  );
}
