import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  getWeeklyMacroTrend,
  getConsistencyScore,
  getTopProteinSources,
  getCategoryDistribution,
  getWeekOverWeekChange,
  getLongestStreak,
  getCurrentStreak,
  getAverages,
  getBestWeek,
  filterByRange,
} from "../utils/analyticsEngine";
import WeekComparison from "./WeekComparison";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RANGE_OPTIONS = [
  { label: "Last 4 weeks", value: "4w" },
  { label: "Last 8 weeks", value: "8w" },
  { label: "All time", value: "all" },
];

function StatCard({ label, value, sub, color = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ChangeRow({ label, value, unit, target }) {
  const positive = value > 0;
  const neutral = Math.abs(value) < 5;
  // "good" means moving towards target — for protein/calories positive is generally good
  const color = neutral
    ? "text-gray-400"
    : positive
    ? "text-green-600"
    : "text-red-500";
  const arrow = neutral ? "→" : positive ? "↑" : "↓";
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>
        {positive ? "+" : ""}{value.toLocaleString()}{unit} {arrow}
      </span>
    </div>
  );
}

export default function AnalyticsDashboard({ archives, currentItems, currentMacros, weekOf }) {
  const [range, setRange] = useState("8w");
  const [showComparison, setShowComparison] = useState(false);

  const filteredArchives = filterByRange(archives, range);
  const trend = getWeeklyMacroTrend(filteredArchives, currentMacros, weekOf);
  const averages = getAverages(filteredArchives);
  const consistency = getConsistencyScore(filteredArchives);
  const topProtein = getTopProteinSources(filteredArchives);
  const catDist = getCategoryDistribution(currentItems);
  const weekChange = getWeekOverWeekChange(archives, currentMacros);
  const streak = getCurrentStreak(archives);
  const longestStreak = getLongestStreak(archives);
  const bestWeek = getBestWeek(filteredArchives);
  const bestWeekLabel = bestWeek
    ? new Date(bestWeek.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  // ── Line chart data ────────────────────────────────────────────────────────
  const lineData = {
    labels: trend.map((w) => w.label),
    datasets: [
      {
        label: "Protein (% of target)",
        data: trend.map((w) => Math.round((w.protein / 1050) * 100)),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.08)",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "#22c55e",
        tension: 0.3,
        fill: false,
      },
      {
        label: "Calories (% of target)",
        data: trend.map((w) => Math.round((w.calories / 13300) * 100)),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.08)",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "#6366f1",
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "top", labels: { font: { size: 12 }, boxWidth: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 130,
        ticks: {
          callback: (v) => `${v}%`,
          font: { size: 11 },
          stepSize: 25,
        },
        grid: { color: "#f3f4f6" },
      },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
    annotation: {
      annotations: {
        target: {
          type: "line",
          yMin: 100,
          yMax: 100,
          borderColor: "rgba(99,102,241,0.3)",
          borderDash: [4, 4],
          borderWidth: 1,
        },
      },
    },
  };

  // ── Donut chart data ───────────────────────────────────────────────────────
  const catColors = {
    Protein: "#22c55e",
    Dairy: "#a855f7",
    Carbs: "#6366f1",
    Vegetables: "#14b8a6",
    Fats: "#f59e0b",
  };
  const catKeys = Object.keys(catDist).filter((k) => catDist[k] > 0);
  const donutData = {
    labels: catKeys,
    datasets: [
      {
        data: catKeys.map((k) => catDist[k]),
        backgroundColor: catKeys.map((k) => catColors[k] ?? "#e5e7eb"),
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };
  const donutOptions = {
    responsive: true,
    plugins: {
      legend: { position: "right", labels: { font: { size: 12 }, boxWidth: 12 } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` } },
    },
    cutout: "58%",
  };

  // ── Bar chart data ─────────────────────────────────────────────────────────
  const barData = {
    labels: topProtein.map((d) => d.name),
    datasets: [
      {
        label: "Total Protein (g)",
        data: topProtein.map((d) => d.totalProtein),
        backgroundColor: "rgba(34,197,94,0.75)",
        borderColor: "#22c55e",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };
  const barOptions = {
    indexAxis: "y",
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw}g protein` } },
    },
    scales: {
      x: { ticks: { font: { size: 11 } }, grid: { color: "#f3f4f6" } },
      y: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };

  const noArchives = archives.length === 0;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === opt.value
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowComparison((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            {showComparison ? "Hide comparison" : "Compare weeks"}
          </button>
        </div>
      </div>

      {noArchives && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          No archived weeks yet. Use <strong>New Week</strong> and archive your current week to start seeing analytics.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Avg Calories"
          value={averages.calories ? averages.calories.toLocaleString() : "—"}
          sub={averages.calories ? `target ${(13300).toLocaleString()}` : "No data"}
          color={
            averages.calories
              ? Math.abs(averages.calories - 13300) / 13300 < 0.1
                ? "text-green-600"
                : "text-gray-900"
              : "text-gray-400"
          }
        />
        <StatCard
          label="Avg Protein"
          value={averages.protein ? `${averages.protein.toLocaleString()}g` : "—"}
          sub={averages.protein ? `target 1,050g` : "No data"}
          color={
            averages.protein
              ? averages.protein >= 1000
                ? "text-green-600"
                : "text-red-500"
              : "text-gray-400"
          }
        />
        <StatCard
          label="Best Week"
          value={bestWeekLabel}
          sub={bestWeek ? `${bestWeek.macroTotals.protein.toLocaleString()}g protein` : "No data"}
        />
        <StatCard
          label="Consistency"
          value={noArchives ? "—" : `${consistency}%`}
          sub="protein + calorie target"
          color={
            noArchives
              ? "text-gray-400"
              : consistency >= 80
              ? "text-green-600"
              : consistency >= 50
              ? "text-amber-500"
              : "text-red-500"
          }
        />
      </div>

      {/* Week comparison */}
      {showComparison && (
        <WeekComparison archives={archives} currentItems={currentItems} currentMacros={currentMacros} />
      )}

      {/* Line chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">
          📈 Weekly Macro Trend
          <span className="text-xs font-normal text-gray-400 ml-2">% of weekly target</span>
        </p>
        {trend.length < 2 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            Archive at least one week to see trends.
          </p>
        ) : (
          <Line data={lineData} options={lineOptions} />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Donut chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            🍩 Calorie Split — This Week
          </p>
          {catKeys.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No items included.</p>
          ) : (
            <Doughnut data={donutData} options={donutOptions} />
          )}
        </div>

        {/* Top protein sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            🏆 Top Protein Sources (all time)
          </p>
          {topProtein.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No archived data yet.</p>
          ) : (
            <Bar data={barData} options={barOptions} />
          )}
        </div>
      </div>

      {/* Week-over-week + streak */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">📅 Week-over-Week Change</p>
          {weekChange ? (
            <div>
              <ChangeRow label="Calories" value={weekChange.calories} unit=" kcal" />
              <ChangeRow label="Protein" value={weekChange.protein} unit="g" />
              <ChangeRow label="Carbs" value={weekChange.carbs} unit="g" />
              <ChangeRow label="Fat" value={weekChange.fat} unit="g" />
            </div>
          ) : (
            <p className="text-sm text-gray-400">Archive a week to see changes.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">🔥 Protein Streaks</p>
          {noArchives ? (
            <p className="text-sm text-gray-400">No data yet.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Current streak</p>
                <p className="text-3xl font-bold text-green-600">
                  {streak}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {streak === 1 ? "week" : "weeks"} hitting target
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Longest streak</p>
                <p className="text-xl font-semibold text-gray-700">
                  {longestStreak}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    {longestStreak === 1 ? "week" : "weeks"}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
