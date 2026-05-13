import "server-only";

import type { Client } from "@notionhq/client";
import { unstable_cache } from "next/cache";

import { normalizeNotionId } from "@/lib/notion/ids";
import { getNotionClient } from "@/lib/notion/server-client";

type DataSourceProps = Awaited<
  ReturnType<Client["dataSources"]["retrieve"]>
>["properties"];

/**
 * Resolved Notion configuration for Trackly (transactions + lookups).
 */
export type TracklyNotionContext = {
  transactionsDataSourceId: string;
  expensesDataSourceId: string;
  accountsDataSourceId: string;
  expensesTitleProperty: string;
  accountsTitleProperty: string;
  properties: {
    title: string;
    amount: string;
    direction: string;
    transactionTime: string;
    necessity: string;
    labels: string | null;
    expenseRelation: string | null;
    accountRelation: string | null;
  };
  directionNames: { inbound: string; outbound: string };
  necessityNames: { yes: string; no: string };
  labelOptions: string[];
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function firstTitlePropertyName(properties: DataSourceProps): string | null {
  for (const [key, cfg] of Object.entries(properties)) {
    if (cfg.type === "title") {
      return key;
    }
  }
  return null;
}

function pickDirectionProperty(
  properties: DataSourceProps,
): { name: string; inbound: string; outbound: string } | null {
  for (const [name, cfg] of Object.entries(properties)) {
    if (cfg.type === "select" && cfg.select?.options?.length) {
      const names = cfg.select.options.map((o) => o.name);
      const inbound = names.find((n) => n.toLowerCase() === "inbound");
      const outbound = names.find((n) => n.toLowerCase() === "outbound");
      if (inbound && outbound) {
        return { name, inbound, outbound };
      }
    }
    if (cfg.type === "status" && cfg.status?.options?.length) {
      const names = cfg.status.options.map((o) => o.name);
      const inbound = names.find((n) => n.toLowerCase() === "inbound");
      const outbound = names.find((n) => n.toLowerCase() === "outbound");
      if (inbound && outbound) {
        return { name, inbound, outbound };
      }
    }
  }
  return null;
}

function pickNecessitySelect(
  properties: DataSourceProps,
): { name: string; yes: string; no: string } | null {
  for (const [name, cfg] of Object.entries(properties)) {
    if (cfg.type !== "select" || !cfg.select?.options?.length) {
      continue;
    }
    const lower = cfg.select.options.map((o) => o.name.toLowerCase());
    if (lower.includes("yes") && lower.includes("no")) {
      const yes = cfg.select.options.find((o) => o.name.toLowerCase() === "yes")!.name;
      const no = cfg.select.options.find((o) => o.name.toLowerCase() === "no")!.name;
      return { name, yes, no };
    }
  }
  return null;
}

function pickLabelsProperty(
  properties: DataSourceProps,
): { name: string; options: string[] } | null {
  for (const [name, cfg] of Object.entries(properties)) {
    if (cfg.type !== "multi_select" || !cfg.multi_select?.options?.length) {
      continue;
    }
    if (/label/i.test(name)) {
      return {
        name,
        options: cfg.multi_select.options.map((o) => o.name),
      };
    }
  }
  for (const [name, cfg] of Object.entries(properties)) {
    if (cfg.type === "multi_select" && cfg.multi_select?.options?.length) {
      return {
        name,
        options: cfg.multi_select.options.map((o) => o.name),
      };
    }
  }
  return null;
}

function pickAmountProperty(properties: DataSourceProps): string | null {
  for (const [name, cfg] of Object.entries(properties)) {
    if (cfg.type !== "number") {
      continue;
    }
    if (/internal|calculated|formula/i.test(name)) {
      continue;
    }
    return name;
  }
  return null;
}

function pickTransactionTimeProperty(
  properties: DataSourceProps,
): string | null {
  for (const [name, cfg] of Object.entries(properties)) {
    if (cfg.type === "date" && /time|transaction|date/i.test(name)) {
      return name;
    }
  }
  for (const [name, cfg] of Object.entries(properties)) {
    if (cfg.type === "date") {
      return name;
    }
  }
  return null;
}

function pickRelationByDatabaseId(
  properties: DataSourceProps,
  targetDatabaseId: string,
): string | null {
  const want = normalizeNotionId(targetDatabaseId);
  for (const [name, cfg] of Object.entries(properties)) {
    if (cfg.type !== "relation" || !cfg.relation) {
      continue;
    }
    const rel = cfg.relation as {
      database_id?: string;
      data_source_id?: string;
    };
    if (rel.database_id && normalizeNotionId(rel.database_id) === want) {
      return name;
    }
  }
  return null;
}

type DatabaseWithSources = {
  data_sources?: { id: string; name?: string }[];
};

/**
 * Load database → data source ids and parse the transactions schema.
 *
 * Returns
 * -------
 * TracklyNotionContext
 *     Data source ids, property names, and select option labels.
 *
 * Raises
 * ------
 * Error
 *     If env vars are missing or the schema cannot be interpreted.
 */
export async function loadTracklyNotionContext(): Promise<TracklyNotionContext> {
  const notion = getNotionClient();
  const transactionsDbId = requireEnv("TRANSACTIONS_DATABASE_ID");
  const expensesDbId = requireEnv("EXPENSES_DATABASE_ID");
  const accountsDbId = requireEnv("ACCOUNTS_DATABASE_ID");

  const [txDb, expDb, accDb] = await Promise.all([
    notion.databases.retrieve({ database_id: transactionsDbId }),
    notion.databases.retrieve({ database_id: expensesDbId }),
    notion.databases.retrieve({ database_id: accountsDbId }),
  ]);

  const txSources = (txDb as typeof txDb & DatabaseWithSources).data_sources;
  const expSources = (expDb as typeof expDb & DatabaseWithSources).data_sources;
  const accSources = (accDb as typeof accDb & DatabaseWithSources).data_sources;

  const txDsId = txSources?.[0]?.id;
  const expDsId = expSources?.[0]?.id;
  const accDsId = accSources?.[0]?.id;
  if (!txDsId || !expDsId || !accDsId) {
    throw new Error("Each Notion database must expose at least one data source.");
  }

  const [txDs, expDs, accDs] = await Promise.all([
    notion.dataSources.retrieve({ data_source_id: txDsId }),
    notion.dataSources.retrieve({ data_source_id: expDsId }),
    notion.dataSources.retrieve({ data_source_id: accDsId }),
  ]);

  const txProps = txDs.properties as DataSourceProps;
  const expProps = expDs.properties as DataSourceProps;
  const accProps = accDs.properties as DataSourceProps;

  const title = firstTitlePropertyName(txProps);
  const amount = pickAmountProperty(txProps);
  const direction = pickDirectionProperty(txProps);
  const transactionTime = pickTransactionTimeProperty(txProps);
  const necessity = pickNecessitySelect(txProps);
  const labels = pickLabelsProperty(txProps);
  const expenseRelation = pickRelationByDatabaseId(txProps, expensesDbId);
  const accountRelation = pickRelationByDatabaseId(txProps, accountsDbId);

  const expTitle = firstTitlePropertyName(expProps);
  const accTitle = firstTitlePropertyName(accProps);

  if (!title || !amount || !direction || !transactionTime || !necessity || !expenseRelation || !accountRelation) {
    throw new Error(
      "Could not map required transaction properties from Notion. Check database schema.",
    );
  }
  if (!expTitle || !accTitle) {
    throw new Error("Expenses or accounts data source is missing a title property.");
  }

  return {
    transactionsDataSourceId: txDsId,
    expensesDataSourceId: expDsId,
    accountsDataSourceId: accDsId,
    expensesTitleProperty: expTitle,
    accountsTitleProperty: accTitle,
    properties: {
      title,
      amount,
      direction: direction.name,
      transactionTime,
      necessity: necessity.name,
      labels: labels?.name ?? null,
      expenseRelation,
      accountRelation,
    },
    directionNames: { inbound: direction.inbound, outbound: direction.outbound },
    necessityNames: { yes: necessity.yes, no: necessity.no },
    labelOptions: labels?.options ?? [],
  };
}

/**
 * Cached Notion context (short TTL) to avoid hammering Notion on each keystroke.
 */
export const getTracklyNotionContext = unstable_cache(
  loadTracklyNotionContext,
  ["trackly-notion-context-v1"],
  { revalidate: 300 },
);
