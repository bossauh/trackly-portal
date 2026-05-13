import "server-only";

import type { CreatePageParameters } from "@notionhq/client";

import type { TracklyNotionContext } from "@/lib/notion/context";

export type CreateTransactionInput = {
  flow: "inbound" | "outbound";
  name: string;
  amount: number;
  transactionTimeIso: string;
  accountPageId: string;
  labels?: string[];
  necessity?: "yes" | "no";
  expensePageId?: string;
};

/**
 * Build a Notion `pages.create` body for a transaction row.
 *
 * Parameters
 * ----------
 * ctx : TracklyNotionContext
 *     Resolved schema and data source ids.
 * input : CreateTransactionInput
 *     Field values from the client (inbound omits expense / necessity).
 *
 * Returns
 * -------
 * CreatePageParameters
 *     Arguments for `notion.pages.create`, including an emoji page icon
 *     (🟢 inbound, 🔴 outbound) so rows show direction in the database UI.
 */
export function buildCreateTransactionParams(
  ctx: TracklyNotionContext,
  input: CreateTransactionInput,
): CreatePageParameters {
  const p = ctx.properties;
  const directionName =
    input.flow === "inbound" ? ctx.directionNames.inbound : ctx.directionNames.outbound;

  const props: CreatePageParameters["properties"] = {
    [p.title]: {
      title: [{ type: "text", text: { content: input.name } }],
    },
    [p.amount]: {
      number: input.amount,
    },
    [p.direction]: {
      select: { name: directionName },
    },
    [p.transactionTime]: {
      date: { start: input.transactionTimeIso },
    },
    [p.accountRelation!]: {
      relation: [{ id: input.accountPageId }],
    },
  };

  if (p.labels && input.labels?.length) {
    props[p.labels] = {
      multi_select: input.labels.map((name) => ({ name })),
    };
  }

  if (input.flow === "outbound") {
    const nec =
      input.necessity === "yes" ? ctx.necessityNames.yes : ctx.necessityNames.no;
    props[p.necessity] = { select: { name: nec } };
    if (input.expensePageId) {
      props[p.expenseRelation!] = {
        relation: [{ id: input.expensePageId }],
      };
    }
  }

  const flowIcon = input.flow === "inbound" ? "🟢" : "🔴";

  return {
    parent: {
      type: "data_source_id",
      data_source_id: ctx.transactionsDataSourceId,
    },
    properties: props,
    icon: {
      type: "emoji",
      emoji: flowIcon,
    },
  };
}
