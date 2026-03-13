import { useState, useCallback } from "react";
import { kimiComplete, kimiStream, isApiKeySet } from "../services/kimiService";
import {
  buildSystemPrompt,
  buildUserMessage,
  buildQuestionMessage,
} from "../utils/promptBuilder";
import { calculateItemMacros, calculateWeeklyTotals } from "../utils/macroCalculator";
import { foodDatabase } from "../data/foodDatabase";

const WEEKLY_PROTEIN_MIN = 1000;
const ITEMS_MIN = 8;

// ── Error messages ────────────────────────────────────────────────────────────

const ERROR_MESSAGES = {
  API_KEY_MISSING: "Add your NVIDIA API key in settings to use AI features.",
  INVALID_API_KEY: "Invalid API key — re-enter it via the gear icon in settings.",
  RATE_LIMITED: "Too many requests. Wait a moment and try again.",
  TIMEOUT: "Kimi took too long (90s). Try a shorter request or try again.",
  NETWORK_ERROR: "Couldn't reach Kimi. Check your connection and try again.",
  INVALID_JSON: "Kimi returned an unexpected response. Try rephrasing your request.",
  MACRO_VIOLATION: "Kimi's suggestion dropped protein below target — rejected automatically.",
  PARSE_ERROR: "Couldn't apply the suggested changes. Your list is unchanged.",
};

function friendlyError(err) {
  const key = err.message?.toUpperCase().replace(/ /g, "_");
  return ERROR_MESSAGES[key] ?? ERROR_MESSAGES[err.message] ?? ERROR_MESSAGES.NETWORK_ERROR;
}

// ── JSON extraction (model may wrap in markdown) ──────────────────────────────

function extractJSON(raw) {
  // Strip thinking tags if present
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Find first { and last } to be safe
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("INVALID_JSON");
  return text.slice(start, end + 1);
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateAndHydrate(parsed, neverBuyIds) {
  if (!Array.isArray(parsed.items)) throw new Error("PARSE_ERROR");
  if (parsed.items.length < ITEMS_MIN) throw new Error("PARSE_ERROR");

  // Ensure macros are re-calculated accurately (don't trust AI math)
  const dbMap = Object.fromEntries(foodDatabase.map((f) => [f.id, f]));

  const hydratedItems = parsed.items.map((item) => {
    const base = dbMap[item.id] ?? item; // fall back to AI-provided fields for custom items
    const qty = Number(item.qty) || base.defaultQty || 100;
    const macros = calculateItemMacros({ ...base, ...item }, qty);
    return {
      ...base,
      ...item,
      qty,
      macros,
      learned: false,
    };
  });

  // Check neverBuy constraint
  const neverSet = new Set(neverBuyIds);
  const violation = hydratedItems.find((i) => neverSet.has(i.id) && i.included);
  if (violation) throw new Error("MACRO_VIOLATION");

  // Check protein floor
  const totals = calculateWeeklyTotals(hydratedItems);
  if (totals.protein < WEEKLY_PROTEIN_MIN) throw new Error("MACRO_VIOLATION");

  return { items: hydratedItems, totals };
}

// ── Intent detection ──────────────────────────────────────────────────────────

const COMMAND_KEYWORDS =
  /\b(make|add|remove|change|swap|more|less|replace|increase|decrease|switch|give me|i want|use|reduce|boost|cut|skip|drop)\b/i;
const QUESTION_KEYWORDS = /\b(why|what|how|explain|tell me|is this|should i|can i)\b/i;

export function detectIntent(input) {
  if (QUESTION_KEYWORDS.test(input)) return "question";
  if (COMMAND_KEYWORDS.test(input)) return "command";
  return "command"; // default to command
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useKimiAI() {
  const [isThinking, setIsThinking] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [pendingResult, setPendingResult] = useState(null); // { items, changes, reasoning, totals }
  const [error, setError] = useState(null);
  const [apiKeyPresent, setApiKeyPresent] = useState(() => isApiKeySet());

  function refreshKeyStatus() {
    setApiKeyPresent(isApiKeySet());
  }

  /**
   * Natural language → grocery list rewrite.
   * Returns { items, changes, reasoning, weeklyMacros } on success.
   */
  const processCommand = useCallback(
    async (input, currentItems, preferenceProfile, weeklyMacros) => {
      setIsThinking(true);
      setError(null);
      setPendingResult(null);

      try {
        const messages = [
          {
            role: "system",
            content: buildSystemPrompt(preferenceProfile),
          },
          {
            role: "user",
            content: buildUserMessage(input, currentItems, weeklyMacros),
          },
        ];

        const raw = await kimiComplete(messages);
        const jsonStr = extractJSON(raw);
        const parsed = JSON.parse(jsonStr);

        const { items, totals } = validateAndHydrate(
          parsed,
          preferenceProfile.neverBuy ?? []
        );

        const result = {
          items,
          changes: parsed.changes ?? [],
          reasoning: parsed.reasoning ?? "",
          weeklyMacros: totals,
        };
        setPendingResult(result);
        return result;
      } catch (err) {
        const msg = friendlyError(err);
        setError(msg);
        throw err;
      } finally {
        setIsThinking(false);
      }
    },
    []
  );

  /**
   * Stream a conversational answer — does NOT modify the grocery list.
   */
  const streamResponse = useCallback(async (input, currentItems, weeklyMacros, profile) => {
    setIsThinking(true);
    setStreamText("");
    setError(null);

    const messages = [
      { role: "system", content: buildSystemPrompt(profile) },
      { role: "user", content: buildQuestionMessage(input, currentItems, weeklyMacros) },
    ];

    await new Promise((resolve) => {
      kimiStream(
        messages,
        (chunk) => setStreamText((prev) => prev + chunk),
        () => {
          setIsThinking(false);
          resolve();
        },
        (err) => {
          setError(friendlyError(err));
          setIsThinking(false);
          resolve();
        }
      );
    });
  }, []);

  function clearPending() {
    setPendingResult(null);
  }

  function clearError() {
    setError(null);
  }

  return {
    isThinking,
    streamText,
    pendingResult,
    error,
    apiKeyPresent,
    processCommand,
    streamResponse,
    detectIntent,
    refreshKeyStatus,
    clearPending,
    clearError,
  };
}
