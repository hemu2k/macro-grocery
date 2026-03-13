# Macro-Aware Grocery Generator — Design Document

> **Owner:** Hemanth Gurappagaru
> **Last updated:** 2026-03-13 (Week 3)
> **Repo:** https://github.com/hemu2k/macro-grocery
> **Stack:** React · Vite · Tailwind CSS · localStorage · Kimi K2.5 (NVIDIA API)

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [User Profile & Targets](#2-user-profile--targets)
3. [Architecture](#3-architecture)
4. [Data Models](#4-data-models)
5. [File Structure](#5-file-structure)
6. [Feature Status by Week](#6-feature-status-by-week)
7. [Component Reference](#7-component-reference)
8. [Hooks Reference](#8-hooks-reference)
9. [Utilities Reference](#9-utilities-reference)
10. [Storage Schema](#10-storage-schema)
11. [Learning System Design](#11-learning-system-design)
12. [AI Integration (Week 3)](#12-ai-integration-week-3)
13. [Roadmap](#13-roadmap)
14. [Changelog](#14-changelog)
11. [Learning System Design](#11-learning-system-design)
12. [Roadmap](#12-roadmap)
13. [Changelog](#13-changelog)

---

## 1. Product Overview

A React web app that generates a personalized weekly grocery list based on macro targets. The app learns from every edit the user makes — deleted items are never suggested again, preferred quantities are remembered, and the list gets smarter over time.

**Core loop:**
1. App generates a weekly grocery list optimized for macro targets
2. User edits the list (qty, toggles, adds/deletes)
3. Every edit is logged to an interaction log
4. On next generation, the preference engine reads the log and personalizes the list
5. InsightsPanel shows the user what the app has learned

---

## 2. User Profile & Targets

| Attribute | Value |
|-----------|-------|
| Name | Hemanth |
| Cuisine | Indian-first (chicken, paneer, dal, eggs, oats, yogurt, rice) |
| Dislikes | Tofu, protein bars |
| Daily calories | 1,800–2,000 kcal |
| Daily protein | 130–150g |
| Daily fat | 50–60g |
| Daily carbs | 180–220g |
| **Weekly calories** | **13,300 kcal** |
| **Weekly protein** | **1,050g** |
| **Weekly fat** | **385g** |
| **Weekly carbs** | **1,470g** |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        App.jsx                           │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │  MacroSummary   │  │       GroceryTable           │  │
│  │  (4 stat cards) │  │  (editable table + modals)   │  │
│  └─────────────────┘  └──────────────────────────────┘  │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │  InsightsPanel  │  │        LogPanel              │  │
│  │  (learned prefs)│  │  (interaction history)       │  │
│  └─────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────┐
│ useGroceryStore │      │ usePreferenceEngine  │
│ (state + sync)  │      │ (profile + insights) │
└─────────────────┘      └──────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────┐
│  localStorage   │      │  preferenceEngine.js │
│  macro-grocery  │      │  (pure functions)    │
│  -v1            │      └──────────────────────┘
└─────────────────┘
┌─────────────────┐
│  localStorage   │
│  macro-grocery  │
│  -archive       │
└─────────────────┘
```

**Data flow:**
- State lives in `useGroceryStore` → synced to localStorage on every change
- Every user action appends to `interactionLog` inside the same state
- `usePreferenceEngine` reads the log reactively and derives a `preferenceProfile`
- `Generate List` runs `generateSmartList` then pipes result through `applyPreferencesToList`
- `New Week` archives current state then generates a fresh personalized list

---

## 4. Data Models

### FoodItem (foodDatabase.js)
```js
{
  id: string,          // e.g. "chicken-breast"
  name: string,        // e.g. "Chicken Breast"
  category: "Protein" | "Carbs" | "Fats" | "Vegetables" | "Dairy",
  unit: "g" | "ml" | "piece",
  defaultQty: number,  // recommended weekly qty
  per100g: {           // per 100g for g/ml units; per piece for unit="piece"
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  }
}
```

### GroceryListItem (state)
```js
{
  ...FoodItem,
  qty: number,         // current qty (editable by user)
  included: boolean,   // toggled in/out of macro totals
  learned: boolean,    // true if qty was auto-set by preference engine
  macros: {            // computed from qty + per100g
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  }
}
```

### InteractionLog entry
```js
{
  timestamp: string,   // ISO date
  action: "add" | "remove" | "qty_change" | "toggle" | "generate",
  itemId: string | null,
  itemName: string | null,
  previousValue: any,
  newValue: any
}
```

### PreferenceProfile (computed, never stored directly)
```js
{
  neverBuy: string[],         // item IDs deleted ≥2 times
  alwaysBuy: string[],        // item IDs never toggled off + in ≥3 generated lists
  preferredQty: { [id]: number }, // avg qty from ≥2 qty_change events
  favoriteCuisine: "Indian" | "General" | "Mixed",
  proteinPreference: string[], // top kept protein item IDs
  avoidList: string[],        // item IDs toggled off ≥3 times
  addedCustomItems: FoodItem[], // custom items added ≥2 times → promoted
}
```

### WeeklyArchive entry
```js
{
  weekOf: string,       // ISO Monday date
  items: GroceryListItem[],
  macroTotals: { calories, protein, carbs, fat },
  generatedAt: string   // ISO timestamp
}
```

---

## 5. File Structure

```
macro-grocery/
├── src/
│   ├── App.jsx                        ← root component, wires everything
│   ├── main.jsx                       ← React entry point
│   ├── index.css                      ← Tailwind directives
│   ├── components/
│   │   ├── MacroSummary.jsx           ← 4 macro stat cards (cal/protein/carbs/fat)
│   │   ├── GroceryTable.jsx           ← main editable table + AI diff highlighting
│   │   ├── AddItemModal.jsx           ← modal: add custom grocery item
│   │   ├── ProgressBar.jsx            ← reusable fill bar with color coding
│   │   ├── InsightsPanel.jsx          ← learned preferences summary card
│   │   ├── LogPanel.jsx               ← collapsible interaction history feed
│   │   ├── WeeklyResetModal.jsx       ← confirm archive + generate new week
│   │   ├── AICommandBar.jsx           ← natural language input bar (Week 3)
│   │   ├── AIResponseStream.jsx       ← streaming AI response + accept/undo (Week 3)
│   │   ├── ThinkingIndicator.jsx      ← animated thinking state with elapsed time (Week 3)
│   │   └── ApiKeyModal.jsx            ← one-time NVIDIA API key setup (Week 3)
│   ├── data/
│   │   ├── foodDatabase.js            ← 15 seed items + WEEKLY_TARGETS
│   │   └── archiveStore.js            ← read/write weekly snapshots to localStorage
│   ├── hooks/
│   │   ├── useGroceryStore.js         ← all state + localStorage sync + undo
│   │   ├── usePreferenceEngine.js     ← reactive preference profile derivation
│   │   └── useKimiAI.js              ← AI state: thinking, pending result, errors (Week 3)
│   ├── services/
│   │   └── kimiService.js             ← Kimi K2.5 API calls, key management (Week 3)
│   └── utils/
│       ├── macroCalculator.js         ← macro math + smart list generator
│       ├── preferenceEngine.js        ← learning logic (pure functions)
│       └── promptBuilder.js           ← system + user prompt construction (Week 3)
├── tailwind.config.js
├── vite.config.js
├── package.json
└── DESIGN.md                          ← this file
```

---

## 6. Feature Status by Week

### Week 1 — Core App ✅ Complete
- [x] Pre-populated grocery list (15 Indian-preferred items)
- [x] Inline editable qty → live macro recalculation
- [x] Include/exclude toggle → live macro totals
- [x] MacroSummary cards with blue/green/red color coding
- [x] Add item modal (persists to localStorage)
- [x] Delete item
- [x] Export to clipboard (formatted by category)
- [x] All interactions logged to `interactionLog`
- [x] Full state persistence on refresh (localStorage `macro-grocery-v1`)
- [x] Mobile responsive (horizontal table scroll)

### Week 2 — Learning Layer ✅ Complete
- [x] `preferenceEngine.js` — builds profile from interaction log
- [x] `neverBuy` items never appear in generated list
- [x] `avoidList` items appear unchecked by default
- [x] `preferredQty` auto-applied on generate
- [x] `alwaysBuy` items always pre-checked
- [x] Blue dot indicator on qty cells auto-set by learned preference
- [x] InsightsPanel with animated confidence bar + "Still learning" placeholder
- [x] LogPanel — collapsible, last 20 interactions, icons, clear with confirm
- [x] WeeklyResetModal — archives current week, generates personalized new list
- [x] Weekly archive persists under `macro-grocery-archive`

### Week 3 — Kimi K2.5 AI Integration ✅ Complete
- [x] `kimiService.js` — streaming + non-streaming API calls, key management
- [x] `promptBuilder.js` — system prompt with macro targets + preference profile
- [x] `useKimiAI.js` hook — AI state, intent detection, validation, error handling
- [x] `ApiKeyModal.jsx` — one-time API key setup with test connection
- [x] `AICommandBar.jsx` — full-width NL input with cycling placeholder examples
- [x] `ThinkingIndicator.jsx` — pulsing dot + elapsed seconds (thinking mode aware)
- [x] `AIResponseStream.jsx` — typewriter change list, macro check, accept/undo
- [x] Settings panel (gear icon) — key status, model info, data management
- [x] GroceryTable diff highlighting — green border (new), blue border/cell (qty change)
- [x] `applyAIRewrite` + `undoAIRewrite` in store — snapshot-based undo
- [x] All AI rewrites logged as `ai_rewrite` in interactionLog
- [x] Validation layer — protein floor 1,000g, neverBuy guard, item count check
- [x] Intent detection — commands rewrite list, questions stream a conversational answer
- [x] All errors handled gracefully (API key missing, rate limit, invalid JSON, etc.)

### Week 4 — Export & Polish 🔜 Planned
- [ ] WhatsApp export (formatted message)
- [ ] Multi-week trend charts (macro coverage over time)
- [ ] Meal plan suggestion based on grocery list
- [ ] User authentication

---

## 7. Component Reference

### `MacroSummary`
| Prop | Type | Description |
|------|------|-------------|
| `totals` | `{ calories, protein, carbs, fat }` | Current weekly macro totals |

Color logic: `< 90%` target → blue · `90–110%` → green · `> 110%` → red

---

### `GroceryTable`
| Prop | Type | Description |
|------|------|-------------|
| `items` | `GroceryListItem[]` | Current list |
| `weekOf` | `string` | ISO Monday date |
| `macroTotals` | `object` | Passed to WeeklyResetModal summary |
| `onToggle(id)` | `fn` | Toggle include/exclude |
| `onUpdateQty(id, qty)` | `fn` | Update item qty |
| `onDelete(id)` | `fn` | Remove item |
| `onAddItem(item)` | `fn` | Add custom item |
| `onGenerate()` | `fn` | Re-generate list with preferences |
| `onExport()` | `fn` | Copy list to clipboard |
| `onNewWeek(shouldArchive)` | `fn` | Archive + reset for new week |

---

### `InsightsPanel`
| Prop | Type | Description |
|------|------|-------------|
| `insights` | `{ type, text }[]` | From `getInsightsSummary()` |
| `confidence` | `number` | 0–100 score |
| `totalInteractions` | `number` | Raw log count |

Shows "Still learning..." placeholder when `confidence < 20`.

---

### `LogPanel`
| Prop | Type | Description |
|------|------|-------------|
| `interactionLog` | `InteractionLog[]` | Full log array |
| `onClearLog()` | `fn` | Clear log (with built-in confirm) |

Collapsed by default. Shows last 20 entries in reverse chronological order.

---

### `WeeklyResetModal`
| Prop | Type | Description |
|------|------|-------------|
| `currentItems` | `GroceryListItem[]` | Current week's list |
| `weekOf` | `string` | Current week ISO date |
| `macroTotals` | `object` | Displayed in summary |
| `onConfirm(shouldArchive)` | `fn` | Archive flag + confirm |
| `onClose()` | `fn` | Dismiss modal |

---

### `ProgressBar`
| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Current value |
| `target` | `number` | Target value |
| `label` | `string?` | Optional label above bar |
| `color` | `"blue" \| "green" \| "red"` | Bar fill color |

---

## 8. Hooks Reference

### `useGroceryStore()`
State shape: `{ items, interactionLog, weekOf }`

| Action | Description |
|--------|-------------|
| `initializeList()` | Generate list using smart defaults + preference profile |
| `resetForNewWeek(shouldArchive)` | Archive current week, generate new personalized list, advance `weekOf` |
| `toggleItem(id)` | Include/exclude item, log action |
| `updateQty(id, qty)` | Update qty, recalculate macros, log action |
| `addItem(item)` | Add new item, log action |
| `deleteItem(id)` | Remove item, log action |
| `getWeeklyMacros()` | Sum macros of all included items |
| `exportList()` | Format list and copy to clipboard |
| `clearLog()` | Reset `interactionLog` to `[]` |

All mutations: update React state → sync localStorage → append to log.

---

### `usePreferenceEngine(interactionLog)`
Reads log reactively and derives profile.

| Return | Type | Description |
|--------|------|-------------|
| `profile` | `PreferenceProfile` | Full derived profile |
| `insights` | `{ type, text }[]` | Human-readable strings |
| `confidence` | `number` | 0–100 score |
| `totalInteractions` | `number` | Log length |
| `applyToList(baseList)` | `fn` | Returns personalized list |

---

## 9. Utilities Reference

### `macroCalculator.js`

| Function | Description |
|----------|-------------|
| `calculateItemMacros(item, qty)` | Returns `{ calories, protein, carbs, fat }` for given qty |
| `calculateWeeklyTotals(items)` | Sums macros of all included items |
| `getProgressPercent(current, target)` | Returns 0–100+ percentage |
| `generateSmartList(db)` | Generates default list: Vegetables → Protein → Carbs → Fats, Indian items preferred |

---

### `preferenceEngine.js`

| Function | Description |
|----------|-------------|
| `buildPreferenceProfile(log)` | Reads raw log → returns `PreferenceProfile` |
| `applyPreferencesToList(baseList, profile)` | Filters neverBuy, applies preferredQty, sets avoidList unchecked |
| `getInsightsSummary(profile)` | Returns `{ type, text }[]` for InsightsPanel |
| `scoreConfidence(log)` | `< 5` → 10 · `5–20` → 40 · `20–50` → 70 · `50+` → 90+ |

**Learning rules:**

| Condition | Effect |
|-----------|--------|
| Item deleted ≥ 2 times | → `neverBuy` · never appears in generated list |
| Item toggled off ≥ 3 times | → `avoidList` · appears unchecked by default |
| Item in ≥ 3 generated lists with zero toggle-offs | → `alwaysBuy` · always pre-checked |
| Qty changed ≥ 2 times | → `preferredQty[id]` = average · applied on generate |
| Custom item added ≥ 2 times | → promoted to permanent list |
| ≥ 60% of kept proteins are Indian | → `favoriteCuisine = "Indian"` |

---

### `archiveStore.js`

| Function | Description |
|----------|-------------|
| `saveWeekToArchive(items, weekOf, macroTotals)` | Appends snapshot to `macro-grocery-archive` |
| `getArchives()` | Returns all archived weeks |
| `getLastWeek()` | Returns most recent archive |
| `clearArchives()` | Dev-only: wipe archive |

---

## 10. Storage Schema

### `macro-grocery-v1` (primary state)
```js
{
  items: GroceryListItem[],
  interactionLog: InteractionLog[],  // capped at 500 entries
  weekOf: string                     // ISO Monday date
}
```

### `macro-grocery-archive` (weekly history)
```js
{
  archives: [
    {
      weekOf: string,
      items: GroceryListItem[],
      macroTotals: { calories, protein, carbs, fat },
      generatedAt: string
    }
  ]
}
```

No migration required between Week 1 and Week 2 — Week 2 only adds a new key.

---

## 11. Learning System Design

### Confidence Score
| Interactions | Score | Meaning |
|-------------|-------|---------|
| < 5 | 10% | Just started, no reliable patterns |
| 5–20 | 40% | Getting there |
| 20–50 | 70% | Good signal |
| 50+ | 90%+ | High confidence |

### Testing the Learning (browser console)
```js
const log = JSON.parse(localStorage.getItem('macro-grocery-v1'))
log.interactionLog = [
  { timestamp: new Date().toISOString(), action: 'remove', itemId: 'whey-protein', itemName: 'Whey Protein', previousValue: null, newValue: null },
  { timestamp: new Date().toISOString(), action: 'remove', itemId: 'whey-protein', itemName: 'Whey Protein', previousValue: null, newValue: null },
  { timestamp: new Date().toISOString(), action: 'qty_change', itemId: 'chicken-breast', itemName: 'Chicken Breast', previousValue: 500, newValue: 700 },
  { timestamp: new Date().toISOString(), action: 'qty_change', itemId: 'chicken-breast', itemName: 'Chicken Breast', previousValue: 600, newValue: 700 },
]
localStorage.setItem('macro-grocery-v1', JSON.stringify(log))
// Refresh — Whey Protein disappears from generated list, Chicken auto-sets to 700g
```

---

## 12. AI Integration (Week 3)

### Kimi K2.5 API
- **Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`
- **Model:** `moonshotai/kimi-k2.5`
- **Thinking mode:** enabled via `chat_template_kwargs: { thinking: true }`
- **Expected latency:** 10–30s (thinking chain consumes tokens before final answer)
- **Key storage:** `localStorage` key `kimi-api-key` — never hardcoded
- **Auth:** Bearer token in `Authorization` header

### Command vs. Question intent detection
| Trigger | Intent | Behavior |
|---------|--------|----------|
| `make`, `add`, `remove`, `more`, `less`, `swap`, `I want`... | `command` | Calls `kimiComplete`, rewrites list as JSON |
| `why`, `what`, `how`, `explain`, `tell me`... | `question` | Calls `kimiStream`, returns conversational text |

### Prompt design
- System prompt includes: macro targets, preference profile (neverBuy/alwaysBuy/preferredQty/cuisine), full food database with macro values, strict JSON output format, hard rules
- User message includes: NL request, current list with macros, weekly totals vs targets
- Model output: `{ reasoning, items[], weeklyMacros, changes[] }`

### Validation before applying AI response
| Check | Rejection reason |
|-------|-----------------|
| `items` missing or not array | `PARSE_ERROR` |
| fewer than 8 items | `PARSE_ERROR` |
| any `neverBuy` item included | `MACRO_VIOLATION` |
| weekly protein < 1,000g | `MACRO_VIOLATION` |

### AI error codes
| Code | User message |
|------|-------------|
| `API_KEY_MISSING` | Add your NVIDIA API key in settings |
| `INVALID_API_KEY` | Invalid API key. Check your key in settings |
| `RATE_LIMITED` | Too many requests. Wait a moment |
| `INVALID_JSON` | Kimi returned an unexpected response. Try rephrasing |
| `MACRO_VIOLATION` | Suggestion dropped protein below target — rejected |
| `PARSE_ERROR` | Couldn't apply the suggested changes |

---

## 13. Roadmap

| Week | Theme | Status |
|------|-------|--------|
| 1 | Core app — editable list, macro tracking, localStorage | ✅ Complete |
| 2 | Learning layer — preference engine, insights, log panel | ✅ Complete |
| 3 | Kimi K2.5 AI — NL commands, streaming, accept/undo | ✅ Complete |
| 4 | Polish — WhatsApp export, trend charts, meal suggestions | 🔜 Planned |

---

## 14. Changelog

### 2026-03-13 — Week 3
- Added `kimiService.js` — streaming + non-streaming Kimi K2.5 API, key CRUD
- Added `promptBuilder.js` — system prompt (targets + preference profile + food DB) + user message
- Added `useKimiAI.js` — AI state management, intent detection, JSON validation
- New components: `AICommandBar`, `AIResponseStream`, `ThinkingIndicator`, `ApiKeyModal`
- Settings panel (gear icon) — key status, model info, data management
- Updated `GroceryTable` — AI diff highlighting (green=new row, blue=qty changed)
- Updated `useGroceryStore` — `applyAIRewrite`, `undoAIRewrite`, snapshot-based undo, `ai_rewrite` log action
- Updated `App.jsx` — wired all AI components, settings panel, error display

### 2026-03-13 — Week 2
- Added `preferenceEngine.js` with full learning logic
- Added `archiveStore.js` for weekly snapshots
- Added `usePreferenceEngine` hook
- Updated `useGroceryStore` — `initializeList` now applies preference profile; added `resetForNewWeek`
- New components: `InsightsPanel`, `LogPanel`, `WeeklyResetModal`
- Updated `GroceryTable` — "New Week" button, blue dot for learned qty
- Updated `App.jsx` — InsightsPanel + LogPanel wired in

### 2026-03-13 — Week 1
- Initial project scaffold (Vite + React + Tailwind)
- `foodDatabase.js` — 15 Indian-preferred seed items
- `macroCalculator.js` — macro math + `generateSmartList`
- `useGroceryStore` — full state + localStorage sync + interaction logging
- Components: `MacroSummary`, `GroceryTable`, `AddItemModal`, `ProgressBar`
