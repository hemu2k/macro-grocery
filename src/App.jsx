import { useState, useRef } from "react";
import MacroSummary from "./components/MacroSummary";
import GroceryTable from "./components/GroceryTable";
import InsightsPanel from "./components/InsightsPanel";
import LogPanel from "./components/LogPanel";
import AICommandBar from "./components/AICommandBar";
import AIResponseStream from "./components/AIResponseStream";
import ThinkingIndicator from "./components/ThinkingIndicator";
import ApiKeyModal from "./components/ApiKeyModal";
import { useGroceryStore } from "./hooks/useGroceryStore";
import { usePreferenceEngine } from "./hooks/usePreferenceEngine";
import { useKimiAI } from "./hooks/useKimiAI";
import { getMaskedKey, isApiKeySet } from "./services/kimiService";
import { getArchives } from "./data/archiveStore";

export default function App() {
  const {
    items,
    interactionLog,
    weekOf,
    canUndo,
    initializeList,
    resetForNewWeek,
    toggleItem,
    updateQty,
    addItem,
    deleteItem,
    getWeeklyMacros,
    exportList,
    clearLog,
    undoAIRewrite,
    applyAIRewrite,
  } = useGroceryStore();

  const { profile, insights, confidence, totalInteractions } =
    usePreferenceEngine(interactionLog);

  const {
    isThinking,
    streamText,
    pendingResult,
    error: aiError,
    apiKeyPresent,
    processCommand,
    streamResponse,
    detectIntent,
    refreshKeyStatus,
    clearPending,
    clearError,
  } = useKimiAI();

  const [showApiKeyModal, setShowApiKeyModal] = useState(!isApiKeySet());
  const [showSettings, setShowSettings] = useState(false);
  const [aiRewriteCount, setAiRewriteCount] = useState(0);
  const [streamAnswer, setStreamAnswer] = useState("");

  const totals = getWeeklyMacros();
  const archives = getArchives();

  // ── AI command handler ────────────────────────────────────────────────────────

  async function handleAICommand(input) {
    const intent = detectIntent(input);
    clearError();
    setStreamAnswer("");

    if (intent === "question") {
      await streamResponse(input, items, totals, profile);
      return;
    }

    // Command — rewrite the list
    try {
      const result = await processCommand(input, items, profile, totals);
      // Don't apply immediately — wait for Accept click
      // pendingResult is set in the hook
    } catch {
      // error is set in hook, displayed below
    }
  }

  function handleAcceptAI() {
    if (!pendingResult) return;
    applyAIRewrite(pendingResult.items, "", pendingResult.changes);
    setAiRewriteCount((c) => c + 1);
    clearPending();
  }

  function handleUndoAI() {
    clearPending();
    undoAIRewrite();
  }

  // ── Settings panel ────────────────────────────────────────────────────────────

  const SettingsPanel = () => (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="flex-1 bg-black/20"
        onClick={() => setShowSettings(false)}
      />
      <div className="w-80 bg-white shadow-2xl h-full overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Settings</h3>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* AI section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">AI</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">NVIDIA API Key</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {isApiKeySet() ? getMaskedKey() : "Not set"}
                  </p>
                </div>
                <button
                  onClick={() => { setShowSettings(false); setShowApiKeyModal(true); }}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  {isApiKeySet() ? "Change" : "Add key"}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Model</span>
                <span className="text-xs text-gray-400 font-mono">moonshotai/kimi-k2.5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Thinking mode</span>
                <span className="text-xs text-green-600 font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <span className={`text-xs font-medium ${isApiKeySet() ? "text-green-600" : "text-gray-400"}`}>
                  {isApiKeySet() ? "Connected ✓" : "No key"}
                </span>
              </div>
            </div>
          </div>

          {/* Macros section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Weekly Targets</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Calories</span><span className="font-medium">13,300 kcal</span></div>
              <div className="flex justify-between"><span>Protein</span><span className="font-medium">1,050g</span></div>
              <div className="flex justify-between"><span>Carbs</span><span className="font-medium">1,470g</span></div>
              <div className="flex justify-between"><span>Fat</span><span className="font-medium">385g</span></div>
            </div>
          </div>

          {/* Data section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Data</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Interaction log</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{totalInteractions} entries</span>
                  <button
                    onClick={() => { clearLog(); setShowSettings(false); }}
                    className="text-xs text-red-400 hover:underline"
                  >
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
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Macro Grocery Planner
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Weekly targets · 13,300 kcal · 1,050g protein · 1,470g carbs · 385g fat
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Macro summary cards */}
        <MacroSummary totals={totals} />

        {/* Insights panel */}
        <InsightsPanel
          insights={insights}
          confidence={confidence}
          totalInteractions={totalInteractions}
        />

        {/* AI command bar */}
        <AICommandBar
          onSubmit={handleAICommand}
          isThinking={isThinking}
          apiKeyPresent={apiKeyPresent}
          onOpenSettings={() => setShowApiKeyModal(true)}
        />

        {/* Thinking indicator */}
        {isThinking && (
          <div className="mb-4">
            <ThinkingIndicator isThinking={isThinking} />
          </div>
        )}

        {/* AI error */}
        {aiError && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <span className="flex-1">{aiError}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
          </div>
        )}

        {/* AI response (pending result or conversational answer) */}
        {(pendingResult || (streamText && !isThinking)) && (
          <div className="mb-4">
            <AIResponseStream
              result={pendingResult}
              streamText={streamText}
              onAccept={handleAcceptAI}
              onUndo={handleUndoAI}
            />
          </div>
        )}

        {/* Grocery table */}
        <GroceryTable
          items={items}
          weekOf={weekOf}
          macroTotals={totals}
          aiRewriteCount={aiRewriteCount}
          onToggle={toggleItem}
          onUpdateQty={updateQty}
          onDelete={deleteItem}
          onAddItem={addItem}
          onGenerate={initializeList}
          onExport={exportList}
          onNewWeek={resetForNewWeek}
        />

        {/* Interaction log */}
        <LogPanel interactionLog={interactionLog} onClearLog={clearLog} />
      </div>

      {/* Modals */}
      {showApiKeyModal && (
        <ApiKeyModal
          onClose={() => setShowApiKeyModal(false)}
          onSaved={() => { refreshKeyStatus(); setShowApiKeyModal(false); }}
        />
      )}

      {showSettings && <SettingsPanel />}
    </div>
  );
}
