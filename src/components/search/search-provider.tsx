"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navItems } from "@/components/layout/nav-items";
import { getAllNodes, getNode, type SyllabusNode } from "@/lib/syllabus";
import { useAppStore } from "@/store/app-store";

const MAX_TOPIC_RESULTS = 12;
const allNodes = getAllNodes();

/**
 * Rank a node against the query: lower is better, null means no match.
 * Title prefix beats title substring beats breadcrumb-path match.
 */
function scoreNode(node: SyllabusNode, query: string): number | null {
  const title = node.title.toLowerCase();
  if (title.startsWith(query)) return 0;
  if (title.includes(query)) return 1;
  if (node.pathTitles.join(" ").toLowerCase().includes(query)) return 2;
  return null;
}

function searchTopics(query: string): SyllabusNode[] {
  const scored: { node: SyllabusNode; score: number }[] = [];
  for (const node of allNodes) {
    const score = scoreNode(node, query);
    if (score !== null) scored.push({ node, score });
  }
  scored.sort(
    (a, b) => a.score - b.score || a.node.title.localeCompare(b.node.title),
  );
  return scored.slice(0, MAX_TOPIC_RESULTS).map((entry) => entry.node);
}

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
  const recentTopics = useAppStore((state) => state.recentTopics);

  // Reset the query each time the palette is opened.
  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();
  const topicResults = q === "" ? [] : searchTopics(q);
  const pageResults =
    q === ""
      ? navItems
      : navItems.filter((item) => item.title.toLowerCase().includes(q));
  const recentNodes =
    q === ""
      ? recentTopics
          .map((id) => getNode(id))
          .filter((node): node is SyllabusNode => !!node)
          .slice(0, 5)
      : [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search UPSC OS">
      <CommandInput
        placeholder="Search syllabus topics and pages…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {recentNodes.length > 0 && (
          <CommandGroup heading="Recent topics">
            {recentNodes.map((node) => (
              <TopicItem key={`recent-${node.id}`} node={node} go={go} />
            ))}
          </CommandGroup>
        )}

        {topicResults.length > 0 && (
          <CommandGroup heading="Syllabus topics">
            {topicResults.map((node) => (
              <TopicItem key={node.id} node={node} go={go} />
            ))}
          </CommandGroup>
        )}

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

function TopicItem({
  node,
  go,
}: {
  node: SyllabusNode;
  go: (href: string) => void;
}) {
  return (
    <CommandItem
      value={node.id}
      onSelect={() => go(`/syllabus/${node.id}`)}
      className="!items-start"
    >
      <FileText className="mt-0.5" />
      <span className="min-w-0">
        <span className="block truncate">{node.title}</span>
        {node.pathTitles.length > 0 && (
          <span className="block truncate text-xs text-muted-foreground">
            {node.pathTitles.join(" · ")}
          </span>
        )}
      </span>
    </CommandItem>
  );
}
