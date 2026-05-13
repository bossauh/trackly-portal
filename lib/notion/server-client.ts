import "server-only";

import { Client } from "@notionhq/client";

let client: Client | null = null;

/**
 * Singleton Notion API client (server-only).
 *
 * Returns
 * -------
 * Client
 *     Configured `@notionhq/client` instance.
 */
export function getNotionClient(): Client {
  if (!client) {
    const auth = process.env.NOTION_ACCESS_TOKEN;
    if (!auth) {
      throw new Error("Missing NOTION_ACCESS_TOKEN");
    }
    client = new Client({ auth });
  }
  return client;
}
