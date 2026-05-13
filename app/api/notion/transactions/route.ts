import { NextResponse } from "next/server";

import { getTracklyNotionContext } from "@/lib/notion/context";
import { notionErrorToHttp } from "@/lib/notion/http-error";
import { getNotionClient } from "@/lib/notion/server-client";
import {
  buildCreateTransactionParams,
  type CreateTransactionInput,
} from "@/lib/notion/transaction-payload";

type PostBody = {
  flow?: string;
  name?: string;
  amount?: number;
  transactionTime?: string;
  accountPageId?: string;
  labels?: string[];
  necessity?: string;
  expensePageId?: string;
};

/**
 * Create a transaction row in the Notion transactions data source.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;
    const flow = body.flow === "inbound" || body.flow === "outbound" ? body.flow : null;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const amount = typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : NaN;
    const transactionTime =
      typeof body.transactionTime === "string" ? body.transactionTime.trim() : "";
    const accountPageId =
      typeof body.accountPageId === "string" ? body.accountPageId.trim() : "";

    if (!flow) {
      return NextResponse.json({ error: "Invalid flow" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount)) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }
    if (!transactionTime) {
      return NextResponse.json({ error: "Transaction time is required" }, { status: 400 });
    }
    if (!accountPageId) {
      return NextResponse.json({ error: "Account is required" }, { status: 400 });
    }

    if (flow === "outbound") {
      const expensePageId =
        typeof body.expensePageId === "string" ? body.expensePageId.trim() : "";
      if (!expensePageId) {
        return NextResponse.json(
          { error: "Tied to expense is required for outbound transactions" },
          { status: 400 },
        );
      }
      const necessity = body.necessity === "yes" || body.necessity === "no" ? body.necessity : null;
      if (!necessity) {
        return NextResponse.json(
          { error: "Necessity (yes or no) is required for outbound transactions" },
          { status: 400 },
        );
      }
    }

    const ctx = await getTracklyNotionContext();
    const labelsRaw =
      Array.isArray(body.labels) && ctx.properties.labels
        ? body.labels.filter((x): x is string => typeof x === "string")
        : [];
    if (labelsRaw.length && ctx.labelOptions.length) {
      const allowed = new Set(ctx.labelOptions);
      for (const l of labelsRaw) {
        if (!allowed.has(l)) {
          return NextResponse.json({ error: `Invalid label: ${l}` }, { status: 400 });
        }
      }
    }
    const labels = labelsRaw.length ? labelsRaw : undefined;

    const input: CreateTransactionInput = {
      flow,
      name,
      amount,
      transactionTimeIso: transactionTime,
      accountPageId,
      labels: labels?.length ? labels : undefined,
    };

    if (flow === "outbound") {
      input.necessity = body.necessity === "yes" ? "yes" : "no";
      input.expensePageId =
        typeof body.expensePageId === "string" ? body.expensePageId.trim() : undefined;
    }

    const notion = getNotionClient();
    const created = await notion.pages.create(buildCreateTransactionParams(ctx, input));
    const url = "url" in created ? (created.url ?? null) : null;

    return NextResponse.json({ id: created.id, url });
  } catch (err) {
    const { status, message } = notionErrorToHttp(err);
    return NextResponse.json({ error: message }, { status });
  }
}
