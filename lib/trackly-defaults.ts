import type { NotionPageIconJson } from "@/lib/notion/page-icon";

/** Current `localStorage` key for form defaults. */
export const TRACKLY_DEFAULTS_KEY = "trackly-defaults-v1";

const LEGACY_DEFAULTS_KEY = "finance-bridge-defaults-v1";

export type TracklyDefaults = {
  lastFlow?: "inbound" | "outbound";
  account?: { id: string; title: string; icon?: NotionPageIconJson | null };
  expense?: { id: string; title: string; icon?: NotionPageIconJson | null };
  necessityYes?: boolean;
};

/**
 * Read persisted form defaults from `localStorage`.
 *
 * Migrates from the pre-rebrand key once if present.
 *
 * Returns
 * -------
 * TracklyDefaults
 *     Parsed object or empty object on parse failure.
 */
export function readDefaults(): TracklyDefaults {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    let raw = window.localStorage.getItem(TRACKLY_DEFAULTS_KEY);
    if (!raw) {
      raw = window.localStorage.getItem(LEGACY_DEFAULTS_KEY);
      if (raw) {
        window.localStorage.setItem(TRACKLY_DEFAULTS_KEY, raw);
      }
    }
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as TracklyDefaults;
  } catch {
    return {};
  }
}
