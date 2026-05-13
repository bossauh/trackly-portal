"use client";

import { addMinutes, format } from "date-fns";
import { CalendarClock } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { apply12ToDate, IOSTimeWheel } from "@/components/ios-time-wheel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function dateAtLocalMidnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function withCalendarDayPreserveTime(base: Date, calDay: Date) {
  const n = new Date(base);
  n.setFullYear(calDay.getFullYear(), calDay.getMonth(), calDay.getDate());
  return n;
}

type DateTimePickerModalProps = {
  /** Current value in local time. */
  value: Date;
  onChange: (next: Date) => void;
  disabled?: boolean;
  id?: string;
};

/**
 * Full-screen friendly modal to pick calendar day and time to the minute (local).
 *
 * Parameters
 * ----------
 * value : Date
 *     Controlled value.
 * onChange : (next: Date) -> None
 *     Called with the new instant when the user confirms.
 * disabled : bool, optional
 *     Disables the trigger button.
 * id : str, optional
 *     Passed to the trigger for label association.
 *
 * Returns
 * -------
 * React.ReactElement
 *     Trigger button plus dialog picker.
 */
export function DateTimePickerModal({ value, onChange, disabled, id }: DateTimePickerModalProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() => new Date(value.getTime()));

  const handlePickTime = React.useCallback((hour12: number, minute: number, isPm: boolean) => {
    setDraft((prev) => apply12ToDate(prev, hour12, minute, isPm));
  }, []);

  function openModal() {
    setDraft(new Date(value.getTime()));
    setOpen(true);
  }

  function apply() {
    onChange(new Date(draft.getTime()));
    setOpen(false);
  }

  const summary = format(value, "EEE, MMM d, yyyy · h:mm a");
  const selectedDay = dateAtLocalMidnight(draft);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="secondary"
        id={id}
        disabled={disabled}
        className="h-11 w-full justify-start gap-2 rounded-lg font-normal"
        onClick={openModal}
      >
        <CalendarClock className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <span className="min-w-0 flex-1 truncate text-left">{summary}</span>
      </Button>

      <DialogContent className="gap-0 p-0 sm:gap-0">
        <DialogHeader>
          <DialogTitle>Date &amp; time</DialogTitle>
          <DialogDescription>Uses your device&apos;s local time zone.</DialogDescription>
        </DialogHeader>

        <div className="trackly-datetime-picker flex min-h-0 flex-1 flex-col overflow-hidden text-zinc-900 dark:text-zinc-50">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setDraft(new Date())}>
                Now
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((d) => {
                    const n = new Date(d);
                    n.setHours(0, 0, 0, 0);
                    return n;
                  })
                }
              >
                Midnight
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((d) => {
                    const n = new Date(d);
                    n.setHours(12, 0, 0, 0);
                    return n;
                  })
                }
              >
                Noon
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((d) => {
                    const n = new Date(d);
                    n.setHours(23, 59, 0, 0);
                    return n;
                  })
                }
              >
                11:59 PM
              </Button>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
              <DayPicker
                mode="single"
                required
                selected={selectedDay}
                onSelect={(d) => {
                  if (d) {
                    setDraft((prev) => withCalendarDayPreserveTime(prev, d));
                  }
                }}
                showOutsideDays
                className="mx-auto w-fit [--rdp-nav-height:2.5rem]"
                classNames={{
                  root: "w-fit text-inherit",
                  month_caption: "relative mb-2 flex h-9 items-center justify-center text-sm font-medium text-inherit",
                  nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
                  button_previous:
                    "inline-flex size-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
                  button_next:
                    "inline-flex size-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
                  weekdays: "flex",
                  weekday:
                    "w-10 text-center text-[11px] font-medium uppercase text-zinc-500 dark:text-zinc-400",
                  week: "mt-1 flex w-full",
                  day: "relative size-10 p-0 text-center",
                  day_button:
                    "inline-flex size-10 items-center justify-center rounded-md text-sm font-medium text-inherit hover:bg-zinc-200/90 dark:hover:bg-zinc-700/90",
                  selected:
                    "!bg-zinc-900 !text-zinc-50 hover:!bg-zinc-800 hover:!text-zinc-50 dark:!bg-zinc-50 dark:!text-zinc-900 dark:hover:!bg-zinc-200 dark:hover:!text-zinc-900",
                  today: "font-semibold text-zinc-900 dark:text-zinc-50",
                  outside: "text-zinc-400 opacity-70 dark:text-zinc-500",
                }}
              />
            </div>

            <div className="mt-5 space-y-3">
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Time
              </Label>
              <IOSTimeWheel open={open} value={draft} onPickTime={handlePickTime} />

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" size="sm" variant="secondary" onClick={() => setDraft((d) => addMinutes(d, -5))}>
                  −5 min
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setDraft((d) => addMinutes(d, -1))}>
                  −1 min
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setDraft((d) => addMinutes(d, 1))}>
                  +1 min
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setDraft((d) => addMinutes(d, 5))}>
                  +5 min
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={apply}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
