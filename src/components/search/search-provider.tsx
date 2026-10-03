"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileQuestion,
  FileText,
  Layers,
  Library,
  Newspaper,
  NotebookPen,
  Tags,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navItems } from "@/components/layout/nav-items";
import { getNode, type SyllabusNode } from "@/lib/syllabus";
import {
  HIT_TYPE_LABELS,
  searchKnowledge,
  type KnowledgeHit,
  type KnowledgeHitType,
} from "@/lib/knowledge/search";
import { useAppStore } from "@/store/app-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { THINKERS } from "@/data/psir/thinkers";
import { PSIR_QUESTIONS } from "@/data/psir/questions";
import { cn } from "@/lib/utils";

const HIT_ICONS: Record<KnowledgeHitType, LucideIcon> = {
  topic: FileText,
  note: NotebookPen,
  "quick-note": Zap,
  keyword: Tags,
  flashcard: Layers,
  pyq: FileQuestion,
  resource: Library,
  "current-affair": Newspaper,
  book: BookOpen,
};

/** Filter chips shown while searching ("All" = no filter). */
const FILTERS: (KnowledgeHitType | null)[] = [
  null,
  "topic",
  "note",
  "keyword",
  "flashcard",
  "pyq",
  "resource",
  "current-affair",
  "book",
];

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
  const [filter, setFilter] = React.useState<KnowledgeHitType | null>(null);
  const recentTopics = useAppStore((state) => state.recentTopics);

  const richNotes = useKnowledgeStore((state) => state.richNotes);
  const quickNotes = useKnowledgeStore((state) => state.quickNotes);
  const flashcards = useKnowledgeStore((state) => state.flashcards);
  const keywords = useKnowledgeStore((state) => state.keywords);
  const bookRefs = useKnowledgeStore((state) => state.bookRefs);
  const resources = useKnowledgeStore((state) => state.resources);
  const pyqs = useKnowledgeStore((state) => state.pyqs);
  const currentAffairs = useKnowledgeStore((state) => state.currentAffairs);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    // Clear the query on close so the palette always opens fresh.
    if (!nextOpen) {
      setQuery("");
      setFilter(null);
    }
  };

  const q = query.trim();
  const hits = React.useMemo(() => {
    if (q === "") return [];
    return searchKnowledge(
      {
        richNotes,
        quickNotes,
        flashcards,
        keywords,
        bookRefs,
        resources,
        pyqs,
        currentAffairs,
      },
      q,
      filter === null ? new Set() : new Set([filter]),
    );
  }, [
    q,
    filter,
    richNotes,
    quickNotes,
    flashcards,
    keywords,
    bookRefs,
    resources,
    pyqs,
    currentAffairs,
  ]);

  const grouped = React.useMemo(() => {
    const groups = new Map<KnowledgeHitType, KnowledgeHit[]>();
    for (const hit of hits) {
      groups.set(hit.type, [...(groups.get(hit.type) ?? []), hit]);
    }
    return groups;
  }, [hits]);

  const lower = q.toLowerCase();
  const thinkerHits =
    q.length < 2 || (filter !== null && filter !== "topic")
      ? []
      : THINKERS.filter((thinker) =>
          `${thinker.name} ${thinker.school}`.toLowerCase().includes(lower),
        ).slice(0, 5);
  const questionHits =
    q.length < 3 || filter !== null
      ? []
      : PSIR_QUESTIONS.filter((question) =>
          lower.split(/\s+/).every((token) => question.text.toLowerCase().includes(token)),
        ).slice(0, 4);

  const pageResults =
    q === ""
      ? navItems
      : navItems.filter((item) =>
          item.title.toLowerCase().includes(q.toLowerCase()),
        );
  const recentNodes =
    q === ""
      ? recentTopics
          .map((id) => getNode(id))
          .filter((node): node is SyllabusNode => !!node)
          .slice(0, 5)
      : [];

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="Search UPSC OS">
      <CommandInput
        placeholder="Search topics, notes, thinkers, questions, PYQs…"
        value={query}
        onValueChange={setQuery}
      />
      {q !== "" && (
        <div className="flex flex-wrap gap-1 border-b px-3 py-2">
          {FILTERS.map((value) => (
            <button
              key={value ?? "all"}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                filter === value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value === null ? "All" : HIT_TYPE_LABELS[value]}
            </button>
          ))}
        </div>
      )}
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {recentNodes.length > 0 && (
          <CommandGroup heading="Recent topics">
            {recentNodes.map((node) => (
              <CommandItem
                key={`recent-${node.id}`}
                value={`recent-${node.id}`}
                onSelect={() => go(`/syllabus/${node.id}`)}
                className="!items-start"
              >
                <FileText className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block truncate">{node.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {node.pathTitles.join(" · ")}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {[...grouped.entries()].map(([type, typeHits]) => {
          const Icon = HIT_ICONS[type];
          return (
            <CommandGroup key={type} heading={HIT_TYPE_LABELS[type]}>
              {typeHits.map((hit, index) => (
                <CommandItem
                  key={`${type}-${index}-${hit.topicId}`}
                  value={`${type}-${index}-${hit.title}`}
                  onSelect={() => go(`/syllabus/${hit.topicId}`)}
                  className="!items-start"
                >
                  <Icon className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block truncate">{hit.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {hit.subtitle}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {thinkerHits.length > 0 && (
          <CommandGroup heading="PSIR thinkers">
            {thinkerHits.map((thinker) => (
              <CommandItem
                key={`thinker-${thinker.id}`}
                value={`thinker-${thinker.id}`}
                onSelect={() => go(`/psir/thinkers#${thinker.id}`)}
                className="!items-start"
              >
                <span aria-hidden className="mt-0.5 w-4 text-center">💬</span>
                <span className="min-w-0">
                  <span className="block truncate">{thinker.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {thinker.period} · {thinker.school}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {questionHits.length > 0 && (
          <CommandGroup heading="Practice questions">
            {questionHits.map((question) => (
              <CommandItem
                key={`question-${question.id}`}
                value={`question-${question.id}`}
                onSelect={() => go(`/practice?q=${question.id}`)}
                className="!items-start"
              >
                <span aria-hidden className="mt-0.5 w-4 text-center">✍️</span>
                <span className="min-w-0">
                  <span className="line-clamp-2">{question.text}</span>
                  <span className="block text-xs text-muted-foreground">
                    {question.marks} marks · write it now
                  </span>
                </span>
              </CommandItem>
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
                <span aria-hidden className="w-4 text-center">{item.emoji}</span>
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
