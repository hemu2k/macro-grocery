const ARCHIVE_KEY = "macro-grocery-archive";

function load() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { archives: [] };
}

function save(data) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(data));
}

/**
 * Appends the current week's list to the archive.
 */
export function saveWeekToArchive(items, weekOf, macroTotals) {
  const data = load();
  data.archives.push({
    weekOf,
    items,
    macroTotals,
    generatedAt: new Date().toISOString(),
  });
  save(data);
}

/**
 * Returns all archived weeks.
 */
export function getArchives() {
  return load().archives;
}

/**
 * Returns the most recent archived week.
 */
export function getLastWeek() {
  const { archives } = load();
  return archives.length > 0 ? archives[archives.length - 1] : null;
}

/**
 * Clears all archives (dev use).
 */
export function clearArchives() {
  save({ archives: [] });
}
