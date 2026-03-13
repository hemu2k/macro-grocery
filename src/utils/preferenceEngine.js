import { foodDatabase } from "../data/foodDatabase";

const INDIAN_PROTEIN_IDS = [
  "chicken-breast",
  "paneer",
  "eggs",
  "dal-lentils",
  "greek-yogurt",
];

const WESTERN_PROTEIN_IDS = ["whey-protein", "almonds"];

const DB_IDS = new Set(foodDatabase.map((f) => f.id));

/**
 * Reads raw interactionLog → returns preferenceProfile object.
 */
export function buildPreferenceProfile(interactionLog) {
  const deleteCount = {}; // itemId → count
  const toggleOffCount = {}; // itemId → count
  const qtyValues = {}; // itemId → number[]
  const generateInclusions = {}; // itemId → times included across generate actions
  const customAdded = {}; // itemId → count (non-db items added)
  const customItems = {}; // itemId → item snapshot

  for (const entry of interactionLog) {
    const { action, itemId, itemName, newValue, previousValue } = entry;

    if (action === "delete") {
      deleteCount[itemId] = (deleteCount[itemId] || 0) + 1;
    }

    if (action === "toggle") {
      // newValue = false means toggled OFF
      if (newValue === false) {
        toggleOffCount[itemId] = (toggleOffCount[itemId] || 0) + 1;
      }
    }

    if (action === "qty_change" && typeof newValue === "number") {
      if (!qtyValues[itemId]) qtyValues[itemId] = [];
      qtyValues[itemId].push(newValue);
    }

    if (action === "add" && itemId && !DB_IDS.has(itemId)) {
      customAdded[itemId] = (customAdded[itemId] || 0) + 1;
      if (newValue && typeof newValue === "object") {
        customItems[itemId] = newValue;
      }
    }

    if (action === "generate" && Array.isArray(newValue)) {
      // newValue is the generated list; count inclusions per item
      newValue
        .filter((i) => i.included)
        .forEach((i) => {
          generateInclusions[i.id] = (generateInclusions[i.id] || 0) + 1;
        });
    }
  }

  // neverBuy: deleted ≥2 times
  const neverBuy = Object.entries(deleteCount)
    .filter(([, count]) => count >= 2)
    .map(([id]) => id);

  // avoidList: toggled off ≥3 times
  const avoidList = Object.entries(toggleOffCount)
    .filter(([, count]) => count >= 3)
    .map(([id]) => id);

  // alwaysBuy: zero toggle-off AND appeared in ≥3 generated lists
  const alwaysBuy = Object.entries(generateInclusions)
    .filter(([id, count]) => count >= 3 && !toggleOffCount[id])
    .map(([id]) => id);

  // preferredQty: average of all qty_change values per item (only if ≥2 changes)
  const preferredQty = {};
  for (const [id, values] of Object.entries(qtyValues)) {
    if (values.length >= 2) {
      preferredQty[id] = Math.round(
        values.reduce((a, b) => a + b, 0) / values.length
      );
    }
  }

  // addedCustomItems: custom items added ≥2 times → promote to permanent
  const addedCustomItems = Object.entries(customAdded)
    .filter(([, count]) => count >= 2)
    .map(([id]) => customItems[id])
    .filter(Boolean);

  // favoriteCuisine: look at protein items kept (not in avoidList/neverBuy)
  const avoidSet = new Set([...neverBuy, ...avoidList]);
  const keptProtein = INDIAN_PROTEIN_IDS.filter((id) => !avoidSet.has(id));
  const keptWestern = WESTERN_PROTEIN_IDS.filter((id) => !avoidSet.has(id));
  const totalProtein = keptProtein.length + keptWestern.length;
  let favoriteCuisine = "Mixed";
  if (totalProtein > 0) {
    const indianRatio = keptProtein.length / totalProtein;
    if (indianRatio >= 0.6) favoriteCuisine = "Indian";
    else if (indianRatio <= 0.4) favoriteCuisine = "General";
  }

  // proteinPreference: most frequently kept protein sources
  const proteinPreference = [...INDIAN_PROTEIN_IDS, ...WESTERN_PROTEIN_IDS]
    .filter((id) => !avoidSet.has(id))
    .slice(0, 3);

  return {
    neverBuy,
    alwaysBuy,
    preferredQty,
    favoriteCuisine,
    proteinPreference,
    avoidList,
    addedCustomItems,
  };
}

/**
 * Takes default generated list + profile → returns personalized list.
 */
export function applyPreferencesToList(baseList, profile) {
  const neverSet = new Set(profile.neverBuy);
  const avoidSet = new Set(profile.avoidList);
  const alwaysSet = new Set(profile.alwaysBuy);

  // Filter out neverBuy entirely
  let list = baseList.filter((item) => !neverSet.has(item.id));

  // Apply preferredQty + mark learned items + set avoidList unchecked + force alwaysBuy on
  list = list.map((item) => {
    const learnedQty = profile.preferredQty[item.id];
    let qty = item.qty;
    let learned = false;

    if (learnedQty !== undefined) {
      qty = learnedQty;
      learned = true;
    }

    const macros = item.per100g
      ? {
          calories: Math.round(
            item.unit === "piece"
              ? item.per100g.calories * qty
              : (item.per100g.calories * qty) / 100
          ),
          protein:
            Math.round(
              (item.unit === "piece"
                ? item.per100g.protein * qty
                : (item.per100g.protein * qty) / 100) * 10
            ) / 10,
          carbs:
            Math.round(
              (item.unit === "piece"
                ? item.per100g.carbs * qty
                : (item.per100g.carbs * qty) / 100) * 10
            ) / 10,
          fat:
            Math.round(
              (item.unit === "piece"
                ? item.per100g.fat * qty
                : (item.per100g.fat * qty) / 100) * 10
            ) / 10,
        }
      : item.macros;

    return {
      ...item,
      qty,
      macros,
      learned,
      included: avoidSet.has(item.id)
        ? false
        : alwaysSet.has(item.id)
        ? true
        : item.included,
    };
  });

  // Always include custom items the user has promoted
  const existingIds = new Set(list.map((i) => i.id));
  for (const custom of profile.addedCustomItems) {
    if (!existingIds.has(custom.id)) {
      list.push({ ...custom, included: true, learned: false });
    }
  }

  return list;
}

/**
 * Returns human-readable insight strings for InsightsPanel.
 */
export function getInsightsSummary(profile) {
  const insights = [];

  if (profile.alwaysBuy.length > 0) {
    const names = profile.alwaysBuy
      .map((id) => foodDatabase.find((f) => f.id === id)?.name ?? id)
      .join(", ");
    insights.push({ type: "always", text: `Always in your list: ${names}` });
  }

  if (profile.neverBuy.length > 0) {
    const names = profile.neverBuy
      .map((id) => foodDatabase.find((f) => f.id === id)?.name ?? id)
      .join(", ");
    insights.push({ type: "never", text: `Never suggest: ${names}` });
  }

  if (profile.avoidList.length > 0) {
    const names = profile.avoidList
      .map((id) => foodDatabase.find((f) => f.id === id)?.name ?? id)
      .join(", ");
    insights.push({ type: "avoid", text: `Usually skip: ${names}` });
  }

  const qtyEntries = Object.entries(profile.preferredQty);
  if (qtyEntries.length > 0) {
    qtyEntries.forEach(([id, qty]) => {
      const name = foodDatabase.find((f) => f.id === id)?.name ?? id;
      const unit = foodDatabase.find((f) => f.id === id)?.unit ?? "g";
      insights.push({ type: "qty", text: `${name} → ${qty}${unit}` });
    });
  }

  if (profile.favoriteCuisine !== "Mixed") {
    insights.push({
      type: "cuisine",
      text: `Cuisine lean: ${profile.favoriteCuisine}`,
    });
  }

  if (profile.addedCustomItems.length > 0) {
    const names = profile.addedCustomItems.map((i) => i.name).join(", ");
    insights.push({ type: "custom", text: `Custom staples: ${names}` });
  }

  return insights;
}

/**
 * Returns 0–100 confidence score based on interaction count.
 */
export function scoreConfidence(interactionLog) {
  const count = interactionLog.length;
  if (count < 5) return 10;
  if (count < 20) return 40;
  if (count < 50) return 70;
  return Math.min(90 + Math.floor((count - 50) / 10), 100);
}
