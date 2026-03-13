import { useState, useEffect } from "react";
import { foodDatabase } from "../data/foodDatabase";
import {
  calculateItemMacros,
  calculateWeeklyTotals,
  generateSmartList,
} from "../utils/macroCalculator";
import {
  buildPreferenceProfile,
  applyPreferencesToList,
} from "../utils/preferenceEngine";
import { saveWeekToArchive } from "../data/archiveStore";

const STORAGE_KEY = "macro-grocery-v1";

function getMonday(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function saveToStorage(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function appendLog(log, entry) {
  return [...log, { ...entry, timestamp: new Date().toISOString() }].slice(
    -500
  );
}

export function useGroceryStore() {
  const [state, setState] = useState(() => {
    const saved = loadFromStorage();
    if (saved) return saved;
    const items = generateSmartList(foodDatabase);
    return { items, interactionLog: [], weekOf: getMonday() };
  });

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  function initializeList() {
    setState((prev) => {
      const baseList = generateSmartList(foodDatabase);
      const profile = buildPreferenceProfile(prev.interactionLog);
      const items = applyPreferencesToList(baseList, profile);
      const log = appendLog(prev.interactionLog, {
        action: "generate",
        itemId: null,
        itemName: null,
        previousValue: null,
        newValue: items,
      });
      return { ...prev, items, interactionLog: log };
    });
  }

  function resetForNewWeek(shouldArchive) {
    setState((prev) => {
      if (shouldArchive) {
        const totals = calculateWeeklyTotals(prev.items);
        saveWeekToArchive(prev.items, prev.weekOf, totals);
      }

      const baseList = generateSmartList(foodDatabase);
      const profile = buildPreferenceProfile(prev.interactionLog);
      const items = applyPreferencesToList(baseList, profile);
      const log = appendLog(prev.interactionLog, {
        action: "generate",
        itemId: null,
        itemName: null,
        previousValue: null,
        newValue: items,
      });

      return {
        ...prev,
        items,
        interactionLog: log,
        weekOf: getMonday(1),
      };
    });
  }

  function toggleItem(id) {
    setState((prev) => {
      const items = prev.items.map((item) =>
        item.id !== id ? item : { ...item, included: !item.included }
      );
      const changed = items.find((i) => i.id === id);
      const log = appendLog(prev.interactionLog, {
        action: "toggle",
        itemId: id,
        itemName: changed.name,
        previousValue: !changed.included,
        newValue: changed.included,
      });
      return { ...prev, items, interactionLog: log };
    });
  }

  function updateQty(id, qty) {
    const numQty = Number(qty);
    if (isNaN(numQty) || numQty < 0) return;
    setState((prev) => {
      const items = prev.items.map((item) => {
        if (item.id !== id) return item;
        const macros = calculateItemMacros(item, numQty);
        return { ...item, qty: numQty, macros };
      });
      const changed = prev.items.find((i) => i.id === id);
      const log = appendLog(prev.interactionLog, {
        action: "qty_change",
        itemId: id,
        itemName: changed.name,
        previousValue: changed.qty,
        newValue: numQty,
      });
      return { ...prev, items, interactionLog: log };
    });
  }

  function addItem(newItem) {
    setState((prev) => {
      const macros = calculateItemMacros(newItem, newItem.qty);
      const item = { ...newItem, macros, included: true };
      const log = appendLog(prev.interactionLog, {
        action: "add",
        itemId: item.id,
        itemName: item.name,
        previousValue: null,
        newValue: item,
      });
      return { ...prev, items: [...prev.items, item], interactionLog: log };
    });
  }

  function deleteItem(id) {
    setState((prev) => {
      const target = prev.items.find((i) => i.id === id);
      const items = prev.items.filter((i) => i.id !== id);
      const log = appendLog(prev.interactionLog, {
        action: "remove",
        itemId: id,
        itemName: target?.name,
        previousValue: target,
        newValue: null,
      });
      return { ...prev, items, interactionLog: log };
    });
  }

  function getWeeklyMacros() {
    return calculateWeeklyTotals(state.items);
  }

  function exportList() {
    const weekDate = new Date(state.weekOf).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const categories = ["Protein", "Dairy", "Carbs", "Vegetables", "Fats"];
    const lines = [`GROCERY LIST — Week of ${weekDate}`, ""];

    categories.forEach((cat) => {
      const catItems = state.items.filter(
        (i) => i.category === cat && i.included
      );
      if (catItems.length === 0) return;
      lines.push(cat.toUpperCase());
      catItems.forEach((i) => {
        lines.push(`${i.name}: ${i.qty}${i.unit}`);
      });
      lines.push("");
    });

    const text = lines.join("\n");
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    return text;
  }

  function clearLog() {
    setState((prev) => ({ ...prev, interactionLog: [] }));
  }

  return {
    items: state.items,
    interactionLog: state.interactionLog,
    weekOf: state.weekOf,
    initializeList,
    resetForNewWeek,
    toggleItem,
    updateQty,
    addItem,
    deleteItem,
    getWeeklyMacros,
    exportList,
    clearLog,
  };
}
