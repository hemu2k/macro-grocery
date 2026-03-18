import { useState, useEffect, useRef } from "react";
import AddItemModal from "./AddItemModal";
import WeeklyResetModal from "./WeeklyResetModal";

const CATEGORY_BADGE = {
  Protein: "bg-green-100 text-green-700",
  Carbs: "bg-blue-100 text-blue-700",
  Fats: "bg-amber-100 text-amber-700",
  Vegetables: "bg-teal-100 text-teal-700",
  Dairy: "bg-purple-100 text-purple-700",
};

// Track which items changed in AI rewrite for diff highlighting
function useDiffHighlight(items, aiRewriteCount) {
  const prevRef = useRef({});
  const [highlights, setHighlights] = useState({});

  useEffect(() => {
    if (!aiRewriteCount) return;
    const prev = prevRef.current;
    const next = {};
    items.forEach((item) => {
      const p = prev[item.id];
      if (!p) {
        next[item.id] = "new";
      } else if (p.qty !== item.qty) {
        next[item.id] = "changed";
      }
    });
    setHighlights(next);
    // Save current as new prev
    prevRef.current = Object.fromEntries(items.map((i) => [i.id, { qty: i.qty }]));
    // Clear highlights after 2.5s
    const t = setTimeout(() => setHighlights({}), 2500);
    return () => clearTimeout(t);
  }, [aiRewriteCount]);

  // Initial snapshot
  useEffect(() => {
    prevRef.current = Object.fromEntries(items.map((i) => [i.id, { qty: i.qty }]));
  }, []);

  return highlights;
}

export default function GroceryTable({
  items,
  onToggle,
  onUpdateQty,
  onDelete,
  onAddItem,
  onGenerate,
  onExport,
  onNewWeek,
  weekOf,
  macroTotals,
  aiRewriteCount = 0,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const highlights = useDiffHighlight(items, aiRewriteCount);

  const weekDate = new Date(weekOf).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Grocery List</h2>
          <p className="text-xs text-gray-400">Week of {weekDate}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onGenerate}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Generate List
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 text-sm bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
          >
            New Week
          </button>
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-sm rounded-lg transition-colors font-medium border bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            Export ↗
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide sticky top-0">
              <th className="px-4 py-3 text-left w-8">#</th>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-left w-10">Unit</th>
              <th className="px-4 py-3 text-right">Cal</th>
              <th className="px-4 py-3 text-right">Protein</th>
              <th className="px-4 py-3 text-right">Carbs</th>
              <th className="px-4 py-3 text-right">Fat</th>
              <th className="px-4 py-3 text-center">Include</th>
              <th className="px-4 py-3 text-center w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const highlight = highlights[item.id];
              const rowBorder =
                highlight === "new"
                  ? "border-l-2 border-l-green-400"
                  : highlight === "changed"
                  ? "border-l-2 border-l-blue-400"
                  : "";

              return (
                <tr
                  key={item.id}
                  className={`border-t border-gray-50 transition-all duration-500 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  } ${!item.included ? "opacity-50" : ""} ${rowBorder}`}
                >
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-700">{item.name}</span>
                      {highlight === "new" && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          AI added
                        </span>
                      )}
                      {item.aiSuggested && !highlight && (
                        <span className="text-xs bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full">
                          AI
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        CATEGORY_BADGE[item.category] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.learned && (
                        <span
                          title="Auto-set from your learned preference"
                          className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"
                        />
                      )}
                      <input
                        type="number"
                        min="0"
                        value={item.qty}
                        onChange={(e) => onUpdateQty(item.id, e.target.value)}
                        className={`w-20 text-right border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors ${
                          highlight === "changed"
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{item.unit}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {item.macros.calories.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                    {item.macros.protein}g
                  </td>
                  <td className="px-4 py-2.5 text-right text-blue-600">
                    {item.macros.carbs}g
                  </td>
                  <td className="px-4 py-2.5 text-right text-amber-600">
                    {item.macros.fat}g
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={() => onToggle(item.id)}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </button>
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          Blue dot = qty learned from history
        </span>
      </div>

      {showAddModal && (
        <AddItemModal
          onAdd={(item) => { onAddItem(item); setShowAddModal(false); }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showResetModal && (
        <WeeklyResetModal
          currentItems={items}
          weekOf={weekOf}
          macroTotals={macroTotals}
          onConfirm={(shouldArchive) => { onNewWeek(shouldArchive); setShowResetModal(false); }}
          onClose={() => setShowResetModal(false)}
        />
      )}
    </div>
  );
}
