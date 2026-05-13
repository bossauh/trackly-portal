import type { PageObjectResponse } from "@notionhq/client";

/**
 * Serializable icon slice for API JSON (emoji text or hosted image URL).
 */
export type NotionPageIconJson = {
  emoji?: string;
  url?: string;
};

/**
 * Extract emoji or image URL from a Notion page `icon` field.
 *
 * Parameters
 * ----------
 * icon : PageObjectResponse["icon"]
 *     Icon payload from a page object (may be null).
 *
 * Returns
 * -------
 * NotionPageIconJson | null
 *     At most one of `emoji` or `url`, or null if unsupported / absent.
 */
export function getPageIconPayload(
  icon: PageObjectResponse["icon"],
): NotionPageIconJson | null {
  if (!icon) {
    return null;
  }
  if (icon.type === "emoji") {
    return { emoji: icon.emoji };
  }
  if (icon.type === "external") {
    return { url: icon.external.url };
  }
  if (icon.type === "file") {
    return { url: icon.file.url };
  }
  if (icon.type === "custom_emoji") {
    return { url: icon.custom_emoji.url };
  }
  return null;
}
