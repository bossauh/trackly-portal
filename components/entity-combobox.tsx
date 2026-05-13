"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotionPageIconJson } from "@/lib/notion/page-icon";
import { cn } from "@/lib/utils";

export type EntityOption = { id: string; title: string; icon?: NotionPageIconJson | null };

function OptionLeadingIcon({ icon }: { icon?: NotionPageIconJson | null }) {
  if (!icon) {
    return <span className="mr-2 inline-block w-5 shrink-0" aria-hidden />;
  }
  if (icon.emoji) {
    return (
      <span className="mr-2 flex size-5 shrink-0 items-center justify-center text-lg leading-none" aria-hidden>
        {icon.emoji}
      </span>
    );
  }
  if (icon.url) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- Notion signed icon URLs */}
        <img
          src={icon.url}
          alt=""
          className="mr-2 size-5 shrink-0 rounded object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </>
    );
  }
  return <span className="mr-2 inline-block w-5 shrink-0" aria-hidden />;
}

type EntityComboboxProps = {
  value: EntityOption | null;
  onChange: (next: EntityOption | null) => void;
  endpoint: "/api/notion/accounts" | "/api/notion/expenses";
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
};

/**
 * Searchable picker backed by Trackly Notion search API routes.
 */
export function EntityCombobox({
  value,
  onChange,
  endpoint,
  placeholder,
  emptyText = "No matches.",
  disabled,
}: EntityComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<EntityOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { items?: EntityOption[]; error?: string };
        if (res.ok && data.items) {
          setItems(data.items);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [endpoint, open, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-11 w-full justify-between rounded-lg font-normal"
        >
          <span className={cn("flex min-w-0 flex-1 items-center", !value && "text-zinc-400")}>
            <OptionLeadingIcon icon={value?.icon} />
            <span className="truncate">{value ? value.title : placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading…" : emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.id}\n${item.title}`}
                  onSelect={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-1 size-4 shrink-0", value?.id === item.id ? "opacity-100" : "opacity-0")}
                  />
                  <OptionLeadingIcon icon={item.icon} />
                  <span className="truncate">{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
