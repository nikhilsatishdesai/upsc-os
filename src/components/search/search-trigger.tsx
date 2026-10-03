"use client";

import { Search } from "lucide-react";

import { useSearch } from "@/components/search/search-provider";

export function SearchTrigger() {
  const { setOpen } = useSearch();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground shadow-soft transition-colors hover:border-primary/30 hover:text-foreground"
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
        Ctrl K
      </kbd>
    </button>
  );
}

export function MobileSearchButton() {
  const { setOpen } = useSearch();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Search"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Search className="h-[18px] w-[18px]" />
    </button>
  );
}
