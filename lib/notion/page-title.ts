import type { PageObjectResponse } from "@notionhq/client";

/**
 * Read plain text from a Notion page title property.
 *
 * Parameters
 * ----------
 * page : PageObjectResponse
 *     Full page payload from a data source query.
 * titleProperty : string
 *     Property name of the title column.
 *
 * Returns
 * -------
 * string
 *     Joined plain text or empty string.
 */
export function getPageTitlePlain(
  page: PageObjectResponse,
  titleProperty: string,
): string {
  const prop = page.properties[titleProperty];
  if (!prop || prop.type !== "title") {
    return "";
  }
  return prop.title.map((t) => t.plain_text).join("").trim();
}
