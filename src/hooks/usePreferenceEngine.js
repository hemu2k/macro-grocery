import { useMemo } from "react";
import {
  buildPreferenceProfile,
  applyPreferencesToList,
  getInsightsSummary,
  scoreConfidence,
} from "../utils/preferenceEngine";

const STORAGE_KEY = "macro-grocery-v1";

function readLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.interactionLog || [];
    }
  } catch {
    // ignore
  }
  return [];
}

export function usePreferenceEngine(interactionLog) {
  // interactionLog is passed in from useGroceryStore so we stay reactive
  const profile = useMemo(
    () => buildPreferenceProfile(interactionLog),
    [interactionLog]
  );

  const insights = useMemo(() => getInsightsSummary(profile), [profile]);

  const confidence = useMemo(
    () => scoreConfidence(interactionLog),
    [interactionLog]
  );

  const totalInteractions = interactionLog.length;

  function applyToList(baseList) {
    return applyPreferencesToList(baseList, profile);
  }

  return {
    profile,
    insights,
    confidence,
    totalInteractions,
    applyToList,
  };
}
