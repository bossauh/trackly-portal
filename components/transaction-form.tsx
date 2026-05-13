"use client";

import { toast } from "sonner";

import { DateTimePickerModal } from "@/components/datetime-picker-modal";
import { EntityCombobox, type EntityOption } from "@/components/entity-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TRACKLY_DEFAULTS_KEY, readDefaults, type TracklyDefaults } from "@/lib/trackly-defaults";
import { cn } from "@/lib/utils";
import * as React from "react";

type Flow = "inbound" | "outbound";

type SchemaState = { labelOptions: string[]; hasLabels: boolean };

/**
 * Two-step Trackly transaction form (Notion-backed).
 *
 * Step 1 chooses inbound vs outbound. Step 2 collects fields; inbound omits
 * expense and necessity. Defaults persist under `TRACKLY_DEFAULTS_KEY`.
 *
 * Returns
 * -------
 * React.ReactElement
 *     Full-page form UI.
 */
export function TransactionForm() {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [flow, setFlow] = React.useState<Flow | null>(null);

  const [amount, setAmount] = React.useState("");
  const [name, setName] = React.useState("");
  const [whenAt, setWhenAt] = React.useState(() => new Date());
  const [account, setAccount] = React.useState<EntityOption | null>(null);
  const [expense, setExpense] = React.useState<EntityOption | null>(null);
  const [necessityYes, setNecessityYes] = React.useState(false);
  const [labels, setLabels] = React.useState<string[]>([]);
  const [labelsOpen, setLabelsOpen] = React.useState(false);
  const [schema, setSchema] = React.useState<SchemaState | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const skipNextPersist = React.useRef(true);

  React.useEffect(() => {
    const d = readDefaults();
    if (d.lastFlow === "inbound" || d.lastFlow === "outbound") {
      setFlow(d.lastFlow);
      setStep(2);
    }
    if (d.account?.id) {
      setAccount(d.account);
    }
    if (d.expense?.id) {
      setExpense(d.expense);
    }
    if (typeof d.necessityYes === "boolean") {
      setNecessityYes(d.necessityYes);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notion/schema");
        const data = (await res.json()) as { labelOptions?: string[]; labelsPropertyName?: string | null };
        if (!cancelled && res.ok) {
          setSchema({
            labelOptions: data.labelOptions ?? [],
            hasLabels: Boolean(data.labelsPropertyName),
          });
        }
      } catch {
        if (!cancelled) {
          setSchema({ labelOptions: [], hasLabels: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    const next: TracklyDefaults = { ...readDefaults() };
    if (flow) {
      next.lastFlow = flow;
    }
    if (account) {
      next.account = account;
    }
    if (expense) {
      next.expense = expense;
    }
    next.necessityYes = necessityYes;
    window.localStorage.setItem(TRACKLY_DEFAULTS_KEY, JSON.stringify(next));
  }, [flow, account, expense, necessityYes]);

  function pickFlow(next: Flow) {
    setFlow(next);
    setStep(2);
  }

  function toggleLabel(option: string) {
    setLabels((prev) =>
      prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!flow) {
      return;
    }
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed)) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!account) {
      toast.error("Choose an account");
      return;
    }
    if (flow === "outbound") {
      if (!expense) {
        toast.error("Choose an expense");
        return;
      }
    }

    const iso = whenAt.toISOString();

    setSubmitting(true);
    try {
      const res = await fetch("/api/notion/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow,
          name,
          amount: parsed,
          transactionTime: iso,
          accountPageId: account.id,
          labels: labels.length ? labels : undefined,
          necessity: flow === "outbound" ? (necessityYes ? "yes" : "no") : undefined,
          expensePageId: flow === "outbound" ? expense?.id : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; url?: string | null };
      if (!res.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      toast.success("Saved", {
        action: data.url
          ? {
              label: "Open",
              onClick: () => window.open(data.url ?? "", "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
      setAmount("");
      setName("");
      setWhenAt(new Date());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Trackly</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Fast captures for your Notion money tracker.
        </p>
      </header>

      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Direction</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              size="lg"
              className="h-auto min-h-[88px] flex-col gap-1 py-5 text-base"
              variant="secondary"
              onClick={() => pickFlow("outbound")}
            >
              <span className="text-2xl leading-none" aria-hidden>
                🔴
              </span>
              <span className="font-semibold">Outbound</span>
              <span className="text-xs font-normal text-zinc-500">Money out</span>
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-auto min-h-[88px] flex-col gap-1 py-5 text-base"
              variant="secondary"
              onClick={() => pickFlow("inbound")}
            >
              <span className="text-2xl leading-none" aria-hidden>
                🟢
              </span>
              <span className="font-semibold">Inbound</span>
              <span className="text-xs font-normal text-zinc-500">Money in</span>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => {
                const next = { ...readDefaults() };
                delete next.lastFlow;
                window.localStorage.setItem(TRACKLY_DEFAULTS_KEY, JSON.stringify(next));
                setStep(1);
                setFlow(null);
              }}
            >
              Back
            </Button>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                flow === "inbound"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                  : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100",
              )}
            >
              <span className="mr-1 text-sm leading-none" aria-hidden>
                {flow === "inbound" ? "🟢" : "🔴"}
              </span>
              {flow === "inbound" ? "Inbound" : "Outbound"}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="off"
              placeholder="Coffee, salary, …"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="transaction-when">When</Label>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setWhenAt(new Date())}>
                  Now
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    const d = new Date();
                    d.setHours(0, 0, 0, 0);
                    setWhenAt(d);
                  }}
                >
                  Midnight
                </Button>
              </div>
            </div>
            <DateTimePickerModal id="transaction-when" value={whenAt} onChange={setWhenAt} />
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
            <EntityCombobox
              endpoint="/api/notion/accounts"
              value={account}
              onChange={setAccount}
              placeholder="Search accounts…"
            />
          </div>

          {flow === "outbound" ? (
            <>
              <div className="space-y-2">
                <Label>Tied to expense</Label>
                <EntityCombobox
                  endpoint="/api/notion/expenses"
                  value={expense}
                  onChange={setExpense}
                  placeholder="Search expenses…"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="space-y-0.5">
                  <Label htmlFor="nec" className="text-base">
                    Necessary?
                  </Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {necessityYes ? "Yes" : "No"}
                  </p>
                </div>
                <Switch id="nec" checked={necessityYes} onCheckedChange={setNecessityYes} />
              </div>
            </>
          ) : null}

          {schema?.hasLabels && schema.labelOptions.length > 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-zinc-800 dark:text-zinc-200"
                onClick={() => setLabelsOpen((o) => !o)}
              >
                Labels
                <span className="text-xs font-normal text-zinc-500">
                  {labels.length ? `${labels.length} selected` : "Optional"}
                </span>
              </button>
              {labelsOpen ? (
                <div className="flex flex-wrap gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
                  {schema.labelOptions.map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      size="sm"
                      variant={labels.includes(opt) ? "default" : "outline"}
                      className="rounded-md"
                      onClick={() => toggleLabel(opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </form>
      )}
    </div>
  );
}
