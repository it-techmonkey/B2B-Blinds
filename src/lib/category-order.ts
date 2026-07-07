export const CATEGORY_ORDER = ["Box Blinds", "Ladder Tapes", "Brackets & Swatches", "Tools & Machines"];

function categoryRank(name: string): number {
  const idx = CATEGORY_ORDER.indexOf(name);
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

/** Sorts category names per CATEGORY_ORDER; unlisted categories are appended alphabetically after it. */
export function compareCategoryNames(a: string, b: string): number {
  const rankDiff = categoryRank(a) - categoryRank(b);
  if (rankDiff !== 0) return rankDiff;
  return a.localeCompare(b);
}

/** Sorts [categoryName, ...] entry tuples (e.g. from Map.entries()) by CATEGORY_ORDER. */
export function sortByCategoryOrder<T extends readonly [string, unknown]>(entries: T[]): T[] {
  return [...entries].sort((a, b) => compareCategoryNames(a[0], b[0]));
}
