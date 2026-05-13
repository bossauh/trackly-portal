import { NextResponse } from "next/server";

import type { PageObjectResponse } from "@notionhq/client";

import { getTracklyNotionContext } from "@/lib/notion/context";
import { notionErrorToHttp } from "@/lib/notion/http-error";
import { getPageIconPayload, type NotionPageIconJson } from "@/lib/notion/page-icon";
import { getPageTitlePlain } from "@/lib/notion/page-title";
import { getNotionClient } from "@/lib/notion/server-client";

export type AccountSearchItem = { id: string; title: string; icon: NotionPageIconJson | null };

/**
 * Search accounts by title (`q` query param). Empty `q` returns recent accounts.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const ctx = await getTracklyNotionContext();
    const notion = getNotionClient();

    const res = await notion.dataSources.query({
      data_source_id: ctx.accountsDataSourceId,
      page_size: 20,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
      ...(q
        ? {
            filter: {
              property: ctx.accountsTitleProperty,
              title: { contains: q },
            },
          }
        : {}),
    });

    const items: AccountSearchItem[] = [];
    for (const row of res.results) {
      if (row.object !== "page" || !("properties" in row)) {
        continue;
      }
      const page = row as PageObjectResponse;
      items.push({
        id: page.id,
        title: getPageTitlePlain(page, ctx.accountsTitleProperty) || "Untitled",
        icon: getPageIconPayload(page.icon),
      });
    }

    return NextResponse.json({ items });
  } catch (err) {
    const { status, message } = notionErrorToHttp(err);
    return NextResponse.json({ error: message }, { status });
  }
}
