import { useState } from "react";

export default function WeeklyResetModal({ currentItems, weekOf, macroTotals, onConfirm, onClose }) {
  const [shouldArchive, setShouldArchive] = useState(true);

  const weekDate = new Date(weekOf).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const nextMonday = (() => {
    const d = new Date(weekOf);
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();

  const includedCount = currentItems.filter((i) => i.included).length;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Start New Week</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current week summary */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Current week summary</p>
            <p className="text-sm font-semibold text-gray-700 mb-3">Week of {weekDate}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-lg p-2.5 text-center">
                <p className="text-gray-400">Items</p>
                <p className="font-bold text-gray-700 text-base">{includedCount}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5 text-center">
                <p className="text-gray-400">Calories</p>
                <p className="font-bold text-gray-700 text-base">
                  {(macroTotals.calories ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg p-2.5 text-center">
                <p className="text-gray-400">Protein</p>
                <p className="font-bold text-green-600 text-base">{macroTotals.protein ?? 0}g</p>
              </div>
              <div className="bg-white rounded-lg p-2.5 text-center">
                <p className="text-gray-400">Carbs</p>
                <p className="font-bold text-blue-600 text-base">{macroTotals.carbs ?? 0}g</p>
              </div>
            </div>
          </div>

          {/* Archive checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shouldArchive}
              onChange={(e) => setShouldArchive(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-indigo-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Archive this week</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Save a snapshot of this week before generating the new list.
              </p>
            </div>
          </label>

          {/* Next week info */}
          <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-700">
            <span className="font-medium">Next week:</span> {nextMonday} · List will be generated using your learned preferences.
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(shouldArchive)}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Generate New Week
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
