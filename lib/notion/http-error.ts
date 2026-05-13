import { APIResponseError } from "@notionhq/client";

/**
 * Map a Notion client error to an HTTP status and public message.
 *
 * Parameters
 * ----------
 * err : unknown
 *     Caught error from `notion.*` calls.
 *
 * Returns
 * -------
 * { status: number; message: string }
 *     Safe response fields for JSON error bodies.
 */
export function notionErrorToHttp(err: unknown): { status: number; message: string } {
  if (err instanceof APIResponseError) {
    return {
      status: err.status,
      message: err.message || "Notion API error",
    };
  }
  if (err instanceof Error) {
    return { status: 500, message: err.message };
  }
  return { status: 500, message: "Unexpected error" };
}
