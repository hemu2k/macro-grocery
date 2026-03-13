import MacroSummary from "./components/MacroSummary";
import GroceryTable from "./components/GroceryTable";
import InsightsPanel from "./components/InsightsPanel";
import LogPanel from "./components/LogPanel";
import { useGroceryStore } from "./hooks/useGroceryStore";
import { usePreferenceEngine } from "./hooks/usePreferenceEngine";

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
    exportList,
    clearLog,
  } = useGroceryStore();

  const { insights, confidence, totalInteractions } = usePreferenceEngine(interactionLog);

  const totals = getWeeklyMacros();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Macro Grocery Planner
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Weekly targets · 13,300 kcal · 1,050g protein · 1,470g carbs · 385g fat
          </p>
        </div>

        {/* Macro summary cards */}
        <MacroSummary totals={totals} />

        {/* Insights panel */}
        <InsightsPanel
          insights={insights}
          confidence={confidence}
          totalInteractions={totalInteractions}
        />

        {/* Grocery table */}
        <GroceryTable
          items={items}
          weekOf={weekOf}
          macroTotals={totals}
          onToggle={toggleItem}
          onUpdateQty={updateQty}
          onDelete={deleteItem}
          onAddItem={addItem}
          onGenerate={initializeList}
          onExport={exportList}
          onNewWeek={resetForNewWeek}
        />

        {/* Interaction log (collapsed by default) */}
        <LogPanel interactionLog={interactionLog} onClearLog={clearLog} />
      </div>
    </div>
  );
}
