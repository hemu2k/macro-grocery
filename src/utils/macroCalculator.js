import { WEEKLY_TARGETS } from "../data/foodDatabase";

/**
 * Calculate macros for an item given its quantity.
 * For "piece" units, per100g values represent per-piece macros.
 */
export function calculateItemMacros(item, qty) {
  const { per100g, unit } = item;
  const multiplier = unit === "piece" ? qty : qty / 100;
  return {
    calories: Math.round(per100g.calories * multiplier),
    protein: Math.round(per100g.protein * multiplier * 10) / 10,
    carbs: Math.round(per100g.carbs * multiplier * 10) / 10,
    fat: Math.round(per100g.fat * multiplier * 10) / 10,
  };
}

/**
 * Sum macros for all included items.
 */
export function calculateWeeklyTotals(items) {
  return items
    .filter((item) => item.included)
    .reduce(
      (acc, item) => ({
        calories: acc.calories + item.macros.calories,
        protein: Math.round((acc.protein + item.macros.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + item.macros.carbs) * 10) / 10,
        fat: Math.round((acc.fat + item.macros.fat) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
}

/**
 * Returns a 0–100+ percentage. Capped at 150 for display purposes.
 */
export function getProgressPercent(current, target) {
  if (!target) return 0;
  return Math.min(Math.round((current / target) * 100), 150);
}

/**
 * Smart list generator — prefers Indian staples.
 * Priority order: Vegetables (always) → Protein → Carbs → Fats
 */
export function generateSmartList(db) {
  const targets = WEEKLY_TARGETS;

  // Indian-preferred ordering for each category
  const proteinOrder = [
    "chicken-breast",
    "eggs",
    "paneer",
    "greek-yogurt",
    "whey-protein",
  ];
  const carbOrder = [
    "dal-lentils",
    "brown-rice",
    "chapati-flour",
    "oats",
    "sweet-potato",
    "banana",
  ];
  const fatOrder = ["almonds", "olive-oil"];
  const vegIds = ["broccoli", "spinach"];

  const sortByOrder = (items, order) =>
    [...items].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const result = [];

  // 1. Vegetables — always included at default qty
  const vegs = db.filter((f) => vegIds.includes(f.id));
  vegs.forEach((item) => {
    const macros = calculateItemMacros(item, item.defaultQty);
    result.push({ ...item, qty: item.defaultQty, included: true, macros });
  });

  // 2. Protein sources — fill to protein target
  let proteinAccum = result.reduce((s, i) => s + i.macros.protein, 0);
  const proteinItems = sortByOrder(
    db.filter((f) => f.category === "Protein" || f.id === "paneer"),
    proteinOrder
  );
  proteinItems.forEach((item) => {
    const macros = calculateItemMacros(item, item.defaultQty);
    const included = proteinAccum < targets.protein;
    if (included) proteinAccum += macros.protein;
    result.push({ ...item, qty: item.defaultQty, included, macros });
  });

  // Also add Greek Yogurt (Dairy, not counted in protein loop above unless paneer already there)
  const dairyItems = db.filter(
    (f) => f.category === "Dairy" && !result.find((r) => r.id === f.id)
  );
  dairyItems.forEach((item) => {
    const macros = calculateItemMacros(item, item.defaultQty);
    const included = proteinAccum < targets.protein;
    if (included) proteinAccum += macros.protein;
    result.push({ ...item, qty: item.defaultQty, included, macros });
  });

  // 3. Carbs — fill remaining calorie budget
  let calAccum = result
    .filter((i) => i.included)
    .reduce((s, i) => s + i.macros.calories, 0);
  const carbItems = sortByOrder(
    db.filter((f) => f.category === "Carbs"),
    carbOrder
  );
  carbItems.forEach((item) => {
    const macros = calculateItemMacros(item, item.defaultQty);
    const included = calAccum < targets.calories;
    if (included) calAccum += macros.calories;
    result.push({ ...item, qty: item.defaultQty, included, macros });
  });

  // 4. Fats — fill fat target
  let fatAccum = result
    .filter((i) => i.included)
    .reduce((s, i) => s + i.macros.fat, 0);
  const fatItems = sortByOrder(
    db.filter((f) => f.category === "Fats"),
    fatOrder
  );
  fatItems.forEach((item) => {
    const macros = calculateItemMacros(item, item.defaultQty);
    const included = fatAccum < targets.fat;
    if (included) fatAccum += macros.fat;
    result.push({ ...item, qty: item.defaultQty, included, macros });
  });

  // Deduplicate (in case any item matched multiple categories)
  const seen = new Set();
  return result.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
