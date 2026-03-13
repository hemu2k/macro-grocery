import { useState, useEffect, useRef } from "react";
import { WEEKLY_TARGETS } from "../data/foodDatabase";

function MacroCheck({ label, value, target, unit }) {
  const pct = (value / target) * 100;
  const ok = pct >= 95 && pct <= 110;
  return (
    <span className={`text-xs font-medium ${ok ? "text-green-600" : "text-amber-600"}`}>
      {label}: {typeof value === "number" ? value.toLocaleString() : value}
      {unit} {ok ? "✓" : "~"}
    </span>
  );
}

export default function AIResponseStream({
  result,           // { items, changes, reasoning, weeklyMacros }
  onAccept,
  onUndo,
  streamText,       // for conversational answers (optional)
}) {
  const [visibleChanges, setVisibleChanges] = useState([]);
  const [accepted, setAccepted] = useState(false);
  const autoAcceptRef = useRef(null);

  const changes = result?.changes ?? [];
  const macros = result?.weeklyMacros;

  // Typewriter reveal for changes list
  useEffect(() => {
    if (!changes.length) return;
    setVisibleChanges([]);
    let i = 0;
    const tick = () => {
      if (i < changes.length) {
        const idx = i;
        setVisibleChanges((prev) => [...prev, changes[idx]]);
        i++;
        setTimeout(tick, 220);
      }
    };
    setTimeout(tick, 200);
  }, [result]);

  // Auto-accept after 30s
  useEffect(() => {
    if (!result || accepted) return;
    autoAcceptRef.current = setTimeout(() => {
      handleAccept();
    }, 30000);
    return () => clearTimeout(autoAcceptRef.current);
  }, [result, accepted]);

  function handleAccept() {
    clearTimeout(autoAcceptRef.current);
    setAccepted(true);
    onAccept?.();
  }

  function handleUndo() {
    clearTimeout(autoAcceptRef.current);
    onUndo?.();
  }

  // Conversational answer (question mode)
  if (!result && streamText) {
    return (
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        <p className="text-xs font-semibold text-indigo-600 mb-1">✦ Kimi</p>
        {streamText}
        {!streamText.endsWith(" ") && (
          <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    );
  }

  if (!result) return null;

  if (accepted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
        ✓ Changes applied to your grocery list
      </div>
    );
  }

  return (
    <div className="bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <span className="text-sm font-semibold text-indigo-700">✦ Kimi rewrote your list</span>
        <span className="text-xs text-indigo-400">auto-accepts in 30s</span>
      </div>

      {/* Reasoning */}
      {result.reasoning && (
        <p className="px-4 pt-3 text-xs text-gray-500 italic">{result.reasoning}</p>
      )}

      {/* Changes */}
      {visibleChanges.length > 0 && (
        <div className="px-4 pt-3 pb-1 space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Changes made
          </p>
          {visibleChanges.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}

      {/* Macro summary */}
      {macros && (
        <div className="px-4 py-3 mt-1 border-t border-gray-50 flex flex-wrap gap-3">
          <MacroCheck label="Protein" value={macros.protein} target={WEEKLY_TARGETS.protein} unit="g" />
          <MacroCheck label="Calories" value={macros.calories} target={WEEKLY_TARGETS.calories} unit=" kcal" />
          <MacroCheck label="Carbs" value={macros.carbs} target={WEEKLY_TARGETS.carbs} unit="g" />
          <MacroCheck label="Fat" value={macros.fat} target={WEEKLY_TARGETS.fat} unit="g" />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-3">
        <button
          onClick={handleAccept}
          className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Accept changes
        </button>
        <button
          onClick={handleUndo}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
