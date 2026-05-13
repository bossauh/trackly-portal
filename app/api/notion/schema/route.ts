import { NextResponse } from "next/server";

import { getTracklyNotionContext } from "@/lib/notion/context";
import { notionErrorToHttp } from "@/lib/notion/http-error";

/**
 * Public schema slice for building the transaction form (no secrets).
 */
export async function GET() {
  try {
    const ctx = await getTracklyNotionContext();
    return NextResponse.json({
      labelOptions: ctx.labelOptions,
      labelsPropertyName: ctx.properties.labels,
    });
  } catch (err) {
    const { status, message } = notionErrorToHttp(err);
    return NextResponse.json({ error: message }, { status });
  }
}
