import { foodDatabase, WEEKLY_TARGETS } from "../data/foodDatabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFoodDatabase() {
  return foodDatabase
    .map(
      (f) =>
        `- ${f.name} (id: ${f.id}, category: ${f.category}, unit: ${f.unit}, ` +
        `cal: ${f.per100g.calories}, protein: ${f.per100g.protein}g, ` +
        `carbs: ${f.per100g.carbs}g, fat: ${f.per100g.fat}g per ${f.unit === "piece" ? "piece" : "100g"})`
    )
    .join("\n");
}

function formatCurrentList(items) {
  return items
    .filter((i) => i.included)
    .map(
      (i) =>
        `- ${i.name}: ${i.qty}${i.unit} → ${i.macros.calories}kcal, ` +
        `${i.macros.protein}g protein, ${i.macros.carbs}g carbs, ${i.macros.fat}g fat`
    )
    .join("\n");
}

function formatProfile(profile) {
  const lines = [];
  if (profile.alwaysBuy?.length)
    lines.push(`Always include: ${profile.alwaysBuy.join(", ")}`);
  if (profile.neverBuy?.length)
    lines.push(`NEVER suggest (user deleted these repeatedly): ${profile.neverBuy.join(", ")}`);
  if (profile.avoidList?.length)
    lines.push(`Usually skip (user toggles these off): ${profile.avoidList.join(", ")}`);
  if (Object.keys(profile.preferredQty ?? {}).length) {
    const qtyStr = Object.entries(profile.preferredQty)
      .map(([id, qty]) => {
        const item = foodDatabase.find((f) => f.id === id);
        return `${item?.name ?? id}: ${qty}${item?.unit ?? "g"}`;
      })
      .join(", ");
    lines.push(`Preferred quantities: ${qtyStr}`);
  }
  if (profile.favoriteCuisine && profile.favoriteCuisine !== "Mixed")
    lines.push(`Cuisine lean: ${profile.favoriteCuisine}`);
  return lines.length ? lines.join("\n") : "No strong preferences learned yet.";
}

function gapString(current, target, unit) {
  const diff = Math.abs(current - target);
  const direction = current < target ? "under" : "over";
  return `${current}${unit} / ${target}${unit} (${diff}${unit} ${direction})`;
}

// ── System prompt ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(profile) {
  return `You are a personal nutrition assistant for Hemanth, an Indian male.
Goal: lose weight while preserving muscle. Daily targets: 1,800–2,000 kcal, 130–150g protein.

WEEKLY MACRO TARGETS (hard constraints):
- Calories: ${WEEKLY_TARGETS.calories} kcal
- Protein:  ${WEEKLY_TARGETS.protein}g  ← NEVER go below 1,000g
- Carbs:    ${WEEKLY_TARGETS.carbs}g
- Fat:      ${WEEKLY_TARGETS.fat}g

USER PREFERENCES (learned from behavior — respect these absolutely):
${formatProfile(profile)}

AVAILABLE FOODS (only use items from this list or keep existing custom items):
${formatFoodDatabase()}

RESPONSE FORMAT — return ONLY valid JSON with NO markdown fences, NO extra text:
{
  "reasoning": "one sentence explaining what you changed and why",
  "items": [
    {
      "id": "chicken-breast",
      "name": "Chicken Breast",
      "category": "Protein",
      "unit": "g",
      "defaultQty": 700,
      "qty": 800,
      "included": true,
      "learned": false,
      "per100g": { "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6 },
      "macros": { "calories": 1320, "protein": 248, "carbs": 0, "fat": 28.8 }
    }
  ],
  "weeklyMacros": { "calories": 13200, "protein": 1060, "carbs": 1450, "fat": 390 },
  "changes": [
    "Increased Chicken Breast 700g → 800g for more protein",
    "Removed Whey Protein (user preference)"
  ]
}

HARD RULES:
1. Return ONLY the JSON object — no markdown, no explanation outside JSON
2. NEVER include any item from the neverBuy list under any circumstances
3. Protein must stay at or above 1,000g weekly
4. Keep total included items between 8 and 18
5. Recalculate macros accurately using the per100g values provided
6. For unit="piece" items (eggs, banana), macros = per100g values × qty
7. For unit="g" or "ml" items, macros = per100g values × (qty / 100)`;
}

// ── User message ──────────────────────────────────────────────────────────────

export function buildUserMessage(input, currentItems, weeklyMacros) {
  const currentList = formatCurrentList(currentItems);
  const t = WEEKLY_TARGETS;

  return `Request: "${input}"

Current grocery list (included items only):
${currentList || "(empty)"}

Current weekly macros vs targets:
- Calories: ${gapString(weeklyMacros.calories, t.calories, " kcal")}
- Protein:  ${gapString(weeklyMacros.protein, t.protein, "g")}
- Carbs:    ${gapString(weeklyMacros.carbs, t.carbs, "g")}
- Fat:      ${gapString(weeklyMacros.fat, t.fat, "g")}

Please modify the grocery list to fulfill my request while keeping weekly macros on target.
Return only the JSON object as specified.`;
}

// ── Conversational (question) prompt ─────────────────────────────────────────

export function buildQuestionMessage(input, currentItems, weeklyMacros) {
  const t = WEEKLY_TARGETS;
  return `Question: "${input}"

Current macro coverage:
- Calories: ${weeklyMacros.calories} / ${t.calories} kcal
- Protein:  ${weeklyMacros.protein} / ${t.protein}g
- Carbs:    ${weeklyMacros.carbs} / ${t.carbs}g
- Fat:      ${weeklyMacros.fat} / ${t.fat}g

Answer concisely in 2-4 sentences. Do not modify the grocery list.`;
}
