import { useState } from "react";
import MacroSummary from "./components/MacroSummary";
import GroceryTable from "./components/GroceryTable";
import InsightsPanel from "./components/InsightsPanel";
import LogPanel from "./components/LogPanel";
import ExportPanel from "./components/ExportPanel";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { useGroceryStore } from "./hooks/useGroceryStore";
import { usePreferenceEngine } from "./hooks/usePreferenceEngine";
import { getArchives } from "./data/archiveStore";

export default function App() {
  const {
    items,
    interactionLog,
    weekOf,
    initializeList,
    resetForNewWeek,
    toggleItem,
    updateQty,
    addItem,
    deleteItem,
    getWeeklyMacros,
    clearLog,
  } = useGroceryStore();

  const { profile, insights, confidence, totalInteractions } =
    usePreferenceEngine(interactionLog);

  const [activeTab, setActiveTab] = useState("grocery");
  const [showExportPanel, setShowExportPanel] = useState(false);

  const totals = getWeeklyMacros();
  const archives = getArchives();

  // ── Settings tab ─────────────────────────────────────────────────────────

  function SettingsContent() {
    return (
      <div className="max-w-md space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Weekly Targets
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            {[
              ["Calories", "13,300 kcal"],
              ["Protein", "1,050g"],
              ["Carbs", "1,470g"],
              ["Fat", "385g"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <span className="font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Data</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Interaction log</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{totalInteractions} entries</span>
                <button onClick={clearLog} className="text-xs text-red-400 hover:underline">
                  Clear
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Weekly archives</span>
              <span className="text-gray-400">{archives.length} weeks</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">About</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>App</span>
              <span className="text-gray-400">Macro Grocery Generator</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Version</span>
              <span className="text-gray-400">4.0</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Storage</span>
              <span className="text-gray-400">localStorage only</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Macro Grocery Planner</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Weekly targets · 13,300 kcal · 1,050g protein · 1,470g carbs · 385g fat
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: "grocery", label: "🛒 Grocery List" },
            { id: "analytics", label: "📊 Analytics" },
            { id: "settings", label: "⚙️ Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grocery tab */}
        {activeTab === "grocery" && (
          <div className="space-y-5">
            <MacroSummary totals={totals} />

            <InsightsPanel
              insights={insights}
              confidence={confidence}
              totalInteractions={totalInteractions}
            />

            <GroceryTable
              items={items}
              weekOf={weekOf}
              macroTotals={totals}
              onToggle={toggleItem}
              onUpdateQty={updateQty}
              onDelete={deleteItem}
              onAddItem={addItem}
              onGenerate={initializeList}
              onExport={() => setShowExportPanel(true)}
              onNewWeek={resetForNewWeek}
            />

            <LogPanel interactionLog={interactionLog} onClearLog={clearLog} />
          </div>
        )}

        {/* Analytics tab */}
        {activeTab === "analytics" && (
          <AnalyticsDashboard
            archives={archives}
            currentItems={items}
            currentMacros={totals}
            weekOf={weekOf}
          />
        )}

        {/* Settings tab */}
        {activeTab === "settings" && <SettingsContent />}
      </div>

      {/* Export panel slide-out */}
      {showExportPanel && (
        <ExportPanel
          items={items}
          weekOf={weekOf}
          macroTotals={totals}
          onClose={() => setShowExportPanel(false)}
        />
      )}
    </div>
  );
}
