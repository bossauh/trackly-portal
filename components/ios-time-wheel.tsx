"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const ITEM_H = 44;
const WHEEL_H = 220;
const PAD = (WHEEL_H - ITEM_H) / 2;

const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTE_LABELS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIOD_LABELS: ["AM", "PM"] = ["AM", "PM"];

/**
 * Split a local `Date` into 12-hour clock parts.
 *
 * Parameters
 * ----------
 * d : Date
 *     Instant in local time.
 *
 * Returns
 * -------
 * dict
 *     ``hour12`` in 1–12, ``minute`` 0–59, ``isPm`` true for afternoon.
 */
export function to12Parts(d: Date) {
  const h24 = d.getHours();
  const minute = d.getMinutes();
  const isPm = h24 >= 12;
  let hour12 = h24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  return { hour12, minute, isPm };
}

/**
 * Apply 12-hour clock parts to a date, preserving the calendar day.
 *
 * Parameters
 * ----------
 * base : Date
 *     Date whose year/month/day are kept.
 * hour12 : int
 *     1–12.
 * minute : int
 *     0–59.
 * isPm : bool
 *     True for PM.
 *
 * Returns
 * -------
 * Date
 *     New `Date` in local time.
 */
export function apply12ToDate(base: Date, hour12: number, minute: number, isPm: boolean) {
  const n = new Date(base);
  let h24 = hour12 % 12;
  if (isPm) {
    h24 += 12;
  }
  n.setHours(h24, minute, 0, 0);
  return n;
}

type SnapColumnProps = {
  items: readonly string[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  open: boolean;
  ariaLabel: string;
  className?: string;
};

/**
 * Vertical snap-scrolling list (iOS alarm–style).
 *
 * Parameters
 * ----------
 * items : list of str
 *     Labels top-to-bottom.
 * selectedIndex : int
 *     Currently selected row index.
 * onSelectIndex : (int) -> None
 *     Called when scrolling settles on a row.
 * open : bool
 *     When false, scroll sync is skipped.
 * ariaLabel : str
 *     Accessible name for the column.
 * className : str, optional
 *     Extra classes on the scroll container.
 *
 * Returns
 * -------
 * React.ReactElement
 *     Scroll column.
 */
function SnapColumn({ items, selectedIndex, onSelectIndex, open, ariaLabel, className }: SnapColumnProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const programmatic = React.useRef(false);
  const idleRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const itemCount = items.length;

  const scrollToIndex = React.useCallback(
    (i: number) => {
      const el = ref.current;
      if (!el) {
        return;
      }
      const clamped = Math.max(0, Math.min(itemCount - 1, i));
      programmatic.current = true;
      el.scrollTop = clamped * ITEM_H;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          programmatic.current = false;
        });
      });
    },
    [itemCount],
  );

  React.useLayoutEffect(() => {
    if (!open) {
      return;
    }
    scrollToIndex(selectedIndex);
  }, [open, selectedIndex, itemCount, scrollToIndex]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    function commit() {
      const node = ref.current;
      if (!node || programmatic.current) {
        return;
      }
      const raw = Math.round(node.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(itemCount - 1, raw));
      if (node.scrollTop !== clamped * ITEM_H) {
        node.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      }
      if (clamped !== selectedIndex) {
        onSelectIndex(clamped);
      }
    }

    function onScroll() {
      if (programmatic.current) {
        return;
      }
      if (idleRef.current !== undefined) {
        clearTimeout(idleRef.current);
      }
      idleRef.current = setTimeout(commit, 100);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", commit);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", commit);
      if (idleRef.current !== undefined) {
        clearTimeout(idleRef.current);
      }
    };
  }, [itemCount, onSelectIndex, selectedIndex]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        "snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      style={{ height: WHEEL_H }}
    >
      <div className="shrink-0" style={{ height: PAD }} aria-hidden />
      {items.map((label, i) => (
        <div
          key={`${label}-${i}`}
          role="option"
          aria-selected={i === selectedIndex}
          className="flex shrink-0 snap-center items-center justify-center font-mono text-lg tabular-nums text-zinc-600 dark:text-zinc-300"
          style={{ height: ITEM_H }}
        >
          {label}
        </div>
      ))}
      <div className="shrink-0" style={{ height: PAD }} aria-hidden />
    </div>
  );
}

export type IOSTimeWheelProps = {
  /** Local time; only hours and minutes are edited. */
  value: Date;
  /** Called with updated time; calendar fields follow `value`. */
  onPickTime: (hour12: number, minute: number, isPm: boolean) => void;
  /** When false, columns do not force-scroll to `value`. */
  open: boolean;
};

/**
 * Three-column iOS-style time picker: hour (1–12), minute, AM/PM.
 *
 * Parameters
 * ----------
 * value : Date
 *     Current local time.
 * onPickTime : (hour12, minute, isPm) -> None
 *     Emits new selection in 12-hour terms.
 * open : bool
 *     Mirrors dialog open state for scroll sync.
 *
 * Returns
 * -------
 * React.ReactElement
 *     Wheel row with selection window and labels.
 */
export function IOSTimeWheel({ value, onPickTime, open }: IOSTimeWheelProps) {
  const { hour12, minute, isPm } = to12Parts(value);
  const hourIndex = hour12 - 1;
  const minuteIndex = minute;
  const periodIndex = isPm ? 1 : 0;

  const onHourIndex = React.useCallback(
    (i: number) => {
      onPickTime(i + 1, minute, isPm);
    },
    [minute, isPm, onPickTime],
  );
  const onMinuteIndex = React.useCallback(
    (i: number) => {
      onPickTime(hour12, i, isPm);
    },
    [hour12, isPm, onPickTime],
  );
  const onPeriodIndex = React.useCallback(
    (i: number) => {
      onPickTime(hour12, minute, i === 1);
    },
    [hour12, minute, onPickTime],
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-3 border-b border-zinc-200 py-2 text-center dark:border-zinc-800">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Hour</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Minute</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Period</span>
      </div>
      <div className="relative" style={{ height: WHEEL_H }}>
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y border-zinc-200/90 bg-zinc-100/40 dark:border-zinc-700/90 dark:bg-zinc-800/40"
          style={{ height: ITEM_H }}
          aria-hidden
        />
        <div
          className="flex h-full [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]"
        >
          <SnapColumn
            className="min-w-0 flex-1 border-r border-zinc-200 dark:border-zinc-800"
            items={HOUR_LABELS}
            selectedIndex={hourIndex}
            open={open}
            ariaLabel="Hour, 1 to 12"
            onSelectIndex={onHourIndex}
          />
          <SnapColumn
            className="min-w-0 flex-1 border-r border-zinc-200 dark:border-zinc-800"
            items={MINUTE_LABELS}
            selectedIndex={minuteIndex}
            open={open}
            ariaLabel="Minute, 00 to 59"
            onSelectIndex={onMinuteIndex}
          />
          <SnapColumn
            className="min-w-0 flex-1"
            items={PERIOD_LABELS}
            selectedIndex={periodIndex}
            open={open}
            ariaLabel="AM or PM"
            onSelectIndex={onPeriodIndex}
          />
        </div>
      </div>
    </div>
  );
}
