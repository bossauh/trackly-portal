/**
 * Normalize a Notion UUID for case-insensitive, dash-insensitive comparison.
 *
 * Parameters
 * ----------
 * id : string
 *     Raw id from env or API.
 *
 * Returns
 * -------
 * string
 *     Lowercase hex without dashes.
 */
export function normalizeNotionId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}
