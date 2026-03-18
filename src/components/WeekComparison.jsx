export default function WeekComparison({ archives, currentItems, currentMacros }) {
  const lastArchive = archives[archives.length - 1];

  if (!lastArchive) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">Week Comparison</p>
        <p className="text-sm text-gray-400">No previous week archived yet.</p>
      </div>
    );
  }

  const prevItems = lastArchive.items ?? [];
  const prevMacros = lastArchive.macroTotals;

  const prevLabel = new Date(lastArchive.weekOf).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Item-level diff
  const prevMap = Object.fromEntries(prevItems.map((i) => [i.name, i]));
  const currMap = Object.fromEntries(currentItems.filter((i) => i.included).map((i) => [i.name, i]));

  const added = currentItems.filter((i) => i.included && !prevMap[i.name]);
  const removed = prevItems.filter((i) => i.included && !currMap[i.name]);
  const changed = currentItems.filter((i) => {
    const p = prevMap[i.name];
    return p && p.qty !== i.qty && i.included;
  });

  function macroRowColor(curr, prev, higherIsBetter = true) {
    const diff = curr - prev;
    if (Math.abs(diff / (prev || 1)) < 0.03) return "text-gray-500";
    if ((diff > 0) === higherIsBetter) return "text-green-600";
    return "text-red-500";
  }

  const rows = [
    { label: "Calories", curr: currentMacros.calories, prev: prevMacros.calories, unit: " kcal", higherIsBetter: false },
    { label: "Protein", curr: currentMacros.protein, prev: prevMacros.protein, unit: "g", higherIsBetter: true },
    { label: "Carbs", curr: currentMacros.carbs, prev: prevMacros.carbs, unit: "g", higherIsBetter: false },
    { label: "Fat", curr: currentMacros.fat, prev: prevMacros.fat, unit: "g", higherIsBetter: false },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">Week Comparison</p>

      {/* Macro table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm min-w-[360px]">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left pb-2 font-medium"></th>
              <th className="text-right pb-2 font-medium">This week</th>
              <th className="text-right pb-2 font-medium">{prevLabel}</th>
              <th className="text-right pb-2 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const diff = row.curr - row.prev;
              const diffColor = macroRowColor(row.curr, row.prev, row.higherIsBetter);
              return (
                <tr key={row.label} className="border-t border-gray-50">
                  <td className="py-2 text-gray-600">{row.label}</td>
                  <td className="py-2 text-right font-medium text-gray-800">
                    {row.curr.toLocaleString()}{row.unit}
                  </td>
                  <td className="py-2 text-right text-gray-400">
                    {row.prev.toLocaleString()}{row.unit}
                  </td>
                  <td className={`py-2 text-right font-semibold ${diffColor}`}>
                    {diff > 0 ? "+" : ""}{Math.round(diff).toLocaleString()}{row.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Item changes */}
      {(added.length > 0 || removed.length > 0 || changed.length > 0) && (
        <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
          {added.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-medium w-20 flex-shrink-0">Added</span>
              <span className="text-gray-600">{added.map((i) => `${i.name} (+${i.qty}${i.unit})`).join(", ")}</span>
            </div>
          )}
          {removed.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-medium w-20 flex-shrink-0">Removed</span>
              <span className="text-gray-600">{removed.map((i) => i.name).join(", ")}</span>
            </div>
          )}
          {changed.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-medium w-20 flex-shrink-0">Changed</span>
              <span className="text-gray-600">
                {changed
                  .map((i) => `${i.name} ${prevMap[i.name]?.qty}${i.unit} → ${i.qty}${i.unit}`)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {added.length === 0 && removed.length === 0 && changed.length === 0 && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">No item-level changes from last week.</p>
      )}
    </div>
  );
}
