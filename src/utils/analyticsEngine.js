import { WEEKLY_TARGETS } from "../data/foodDatabase";

export function getWeeklyMacroTrend(archives, currentWeekMacros, currentWeekOf) {
  const weeks = [
    ...archives.map((a) => ({ weekOf: a.weekOf, ...a.macroTotals })),
    { weekOf: currentWeekOf, ...currentWeekMacros },
  ].sort((a, b) => new Date(a.weekOf) - new Date(b.weekOf));

  return weeks.map((w) => ({
    ...w,
    label: new Date(w.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    proteinTarget: WEEKLY_TARGETS.protein,
    calorieTarget: WEEKLY_TARGETS.calories,
  }));
}

export function getConsistencyScore(archives) {
  if (!archives.length) return 0;
  const proteinHits = archives.filter((a) => a.macroTotals.protein >= 1000).length;
  const calorieHits = archives.filter(
    (a) => a.macroTotals.calories >= 12000 && a.macroTotals.calories <= 14000
  ).length;
  return Math.round(
    (proteinHits / archives.length) * 0.6 * 100 +
      (calorieHits / archives.length) * 0.4 * 100
  );
}

export function getMostBoughtItems(archives) {
  const map = {};
  archives.forEach((week) => {
    (week.items ?? [])
      .filter((i) => i.included)
      .forEach((item) => {
        if (!map[item.name]) map[item.name] = { weeks: 0, totalQty: 0, totalProtein: 0 };
        map[item.name].weeks += 1;
        map[item.name].totalQty += item.qty;
        map[item.name].totalProtein += item.macros?.protein ?? 0;
      });
  });
  return Object.entries(map)
    .map(([name, d]) => ({
      itemName: name,
      weeksIncluded: d.weeks,
      averageQty: Math.round(d.totalQty / d.weeks),
      totalProteinContributed: Math.round(d.totalProtein),
    }))
    .sort((a, b) => b.weeksIncluded - a.weeksIncluded)
    .slice(0, 10);
}

export function getTopProteinSources(archives) {
  const map = {};
  archives.forEach((week) => {
    (week.items ?? [])
      .filter((i) => i.included)
      .forEach((item) => {
        const p = item.macros?.protein ?? 0;
        map[item.name] = (map[item.name] ?? 0) + p;
      });
  });
  return Object.entries(map)
    .map(([name, totalProtein]) => ({ name, totalProtein: Math.round(totalProtein) }))
    .sort((a, b) => b.totalProtein - a.totalProtein)
    .slice(0, 5);
}

export function getCategoryDistribution(items) {
  const included = items.filter((i) => i.included);
  const totals = { Protein: 0, Carbs: 0, Fats: 0, Dairy: 0, Vegetables: 0 };
  included.forEach((item) => {
    if (item.category in totals) totals[item.category] += item.macros?.calories ?? 0;
  });
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  if (!total) return totals;
  const out = {};
  Object.keys(totals).forEach((k) => {
    out[k] = Math.round((totals[k] / total) * 100);
  });
  return out;
}

export function getWeekOverWeekChange(archives, currentWeekMacros) {
  const last = archives[archives.length - 1];
  if (!last) return null;
  const prev = last.macroTotals;
  return {
    calories: Math.round(currentWeekMacros.calories - prev.calories),
    protein: Math.round(currentWeekMacros.protein - prev.protein),
    carbs: Math.round(currentWeekMacros.carbs - prev.carbs),
    fat: Math.round(currentWeekMacros.fat - prev.fat),
  };
}

export function getLongestStreak(archives) {
  let current = 0, best = 0;
  archives.forEach((a) => {
    if (a.macroTotals.protein >= 1000) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });
  return best;
}

export function getCurrentStreak(archives) {
  let streak = 0;
  for (let i = archives.length - 1; i >= 0; i--) {
    if (archives[i].macroTotals.protein >= 1000) streak++;
    else break;
  }
  return streak;
}

export function getAverages(archives) {
  if (!archives.length) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const sum = archives.reduce(
    (acc, a) => ({
      calories: acc.calories + a.macroTotals.calories,
      protein: acc.protein + a.macroTotals.protein,
      carbs: acc.carbs + a.macroTotals.carbs,
      fat: acc.fat + a.macroTotals.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const n = archives.length;
  return {
    calories: Math.round(sum.calories / n),
    protein: Math.round(sum.protein / n),
    carbs: Math.round(sum.carbs / n),
    fat: Math.round(sum.fat / n),
  };
}

export function getBestWeek(archives) {
  if (!archives.length) return null;
  return archives.reduce((best, a) =>
    a.macroTotals.protein > best.macroTotals.protein ? a : best
  );
}

export function filterByRange(archives, range) {
  if (range === "all") return archives;
  const weeks = range === "4w" ? 4 : 8;
  return archives.slice(-weeks);
}
