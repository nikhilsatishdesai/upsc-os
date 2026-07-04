"use client";

import { Search } from "lucide-react";

import { useSearch } from "@/components/search/search-provider";

export function SearchTrigger() {
  const { setOpen } = useSearch();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-secondary"
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
      className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
    >
      <Search className="h-5 w-5" />
      Search
    </button>
  );
}
