import ProgressBar from "./ProgressBar";
import { WEEKLY_TARGETS } from "../data/foodDatabase";

const CARDS = [
  { key: "calories", label: "Calories", unit: "kcal", target: WEEKLY_TARGETS.calories },
  { key: "protein", label: "Protein", unit: "g", target: WEEKLY_TARGETS.protein },
  { key: "carbs", label: "Carbs", unit: "g", target: WEEKLY_TARGETS.carbs },
  { key: "fat", label: "Fat", unit: "g", target: WEEKLY_TARGETS.fat },
];

function getColor(current, target) {
  const pct = (current / target) * 100;
  if (pct < 90) return "blue";
  if (pct <= 110) return "green";
  return "red";
}

function getTextColor(current, target) {
  const color = getColor(current, target);
  if (color === "blue") return "text-blue-600";
  if (color === "green") return "text-green-600";
  return "text-red-600";
}

function getBorderColor(current, target) {
  const color = getColor(current, target);
  if (color === "blue") return "border-blue-200";
  if (color === "green") return "border-green-200";
  return "border-red-200";
}

export default function MacroSummary({ totals }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {CARDS.map(({ key, label, unit, target }) => {
        const current = totals[key] ?? 0;
        const color = getColor(current, target);
        const pct = Math.round((current / target) * 100);

        return (
          <div
            key={key}
            className={`bg-white border-2 ${getBorderColor(current, target)} rounded-xl p-4 shadow-sm`}
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {label}
            </p>
            <p className={`text-2xl font-bold ${getTextColor(current, target)}`}>
              {key === "calories"
                ? current.toLocaleString()
                : current.toFixed(0)}
              <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
            </p>
            <p className="text-xs text-gray-400 mb-2">
              Target: {key === "calories" ? target.toLocaleString() : target}{unit}
            </p>
            <ProgressBar value={current} target={target} color={color} />
            <p className={`text-xs mt-1 font-medium ${getTextColor(current, target)}`}>
              {pct}% of weekly target
            </p>
          </div>
        );
      })}
    </div>
  );
}
