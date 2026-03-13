import { useState } from "react";

const ACTION_CONFIG = {
  remove: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    color: "text-red-500 bg-red-50",
    label: (e) => `Deleted "${e.itemName}"`,
  },
  toggle: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ),
    color: (e) =>
      e.newValue === false ? "text-red-400 bg-red-50" : "text-green-500 bg-green-50",
    label: (e) =>
      e.newValue === false
        ? `Toggled off "${e.itemName}"`
        : `Toggled on "${e.itemName}"`,
  },
  qty_change: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    color: "text-blue-500 bg-blue-50",
    label: (e) =>
      `Changed "${e.itemName}" qty: ${e.previousValue} → ${e.newValue}`,
  },
  add: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    color: "text-green-600 bg-green-50",
    label: (e) => `Added "${e.itemName}"`,
  },
  generate: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    color: "text-indigo-500 bg-indigo-50",
    label: () => "Generated new list",
  },
};

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LogPanel({ interactionLog, onClearLog }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const recent = [...interactionLog].reverse().slice(0, 20);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-6">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Interaction Log
          </span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {interactionLog.length} total
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-gray-100">
          {recent.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 italic">
              No interactions yet. Edit your list to start logging.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map((entry, idx) => {
                const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.generate;
                const colorClass =
                  typeof config.color === "function"
                    ? config.color(entry)
                    : config.color;
                const label = config.label(entry);

                return (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                    <span
                      className={`flex-shrink-0 p-1.5 rounded-full ${colorClass}`}
                    >
                      {config.icon}
                    </span>
                    <span className="text-sm text-gray-700 flex-1">{label}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing last {Math.min(20, interactionLog.length)} of{" "}
              {interactionLog.length}
            </span>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Are you sure?</span>
                <button
                  onClick={() => {
                    onClearLog();
                    setConfirmClear(false);
                  }}
                  className="text-xs text-red-600 font-medium hover:underline"
                >
                  Yes, clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear log
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
