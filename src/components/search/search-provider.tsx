"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navItems } from "@/components/layout/nav-items";

type SearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SearchContext = React.createContext<SearchContextValue | null>(null);

export function useSearch() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
      <SearchCommandDialog open={open} setOpen={setOpen} go={go} />
    </SearchContext.Provider>
  );
}

function SearchCommandDialog({
  open,
  setOpen,
  go,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  go: (href: string) => void;
}) {
  const [query, setQuery] = React.useState("");

  // Reset the query each time the palette is opened.
  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();
  const pageResults = navItems.filter(
    (item) => q === "" || item.title.toLowerCase().includes(q),
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search UPSC OS"
    >
      <CommandInput
        placeholder="Search topics and pages…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {pageResults.length > 0 && (
          <CommandGroup heading="Pages">
            {pageResults.map((item) => (
              <CommandItem
                key={item.href}
                value={`page-${item.href}`}
                onSelect={() => go(item.href)}
              >
                <item.icon />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
