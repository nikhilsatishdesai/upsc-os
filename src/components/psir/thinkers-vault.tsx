"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";

import { getNode } from "@/lib/syllabus";
import { THINKERS, THINKER_CATEGORY_META } from "@/data/psir/thinkers";
import type { Thinker, ThinkerCategory } from "@/data/psir/types";
import type { ThinkerStatus } from "@/lib/practice/types";
import { usePracticeStore } from "@/store/practice-store";
import { useMounted } from "@/hooks/use-mounted";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORY_TAG: Record<ThinkerCategory, string> = {
  western: "tag-blue",
  indian: "tag-orange",
  theory: "tag-purple",
  "indian-politics": "tag-brown",
  "comparative-ir": "tag-green",
};

type StatusFilter = "all" | "new" | ThinkerStatus;

/**
 * The thinkers vault: a searchable gallery of one-page thinker sheets
 * (works, ideas, quotes, critiques, where to use them) with mastery
 * tracking. `#id` deep links open and scroll to a sheet.
 */
export function ThinkersVault() {
  const mounted = useMounted();
  const statuses = usePracticeStore((state) => state.thinkers);
  const setStatus = usePracticeStore((state) => state.setThinkerStatus);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<ThinkerCategory | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [syllabusOnly, setSyllabusOnly] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);

  // Deep link: /psir/thinkers#rawls opens and reveals that sheet.
  React.useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !THINKERS.some((thinker) => thinker.id === id)) return;
    const timer = window.setTimeout(() => {
      setOpenId(id);
      window.requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const statusOf = (id: string): ThinkerStatus | undefined =>
    mounted ? statuses[id] : undefined;

  const q = query.trim().toLowerCase();
  const visible = THINKERS.filter((thinker) => {
    if (category !== "all" && thinker.category !== category) return false;
    if (syllabusOnly && !thinker.inSyllabus) return false;
    const status = statusOf(thinker.id);
    if (statusFilter === "new" && status) return false;
    if ((statusFilter === "learning" || statusFilter === "mastered") && status !== statusFilter) {
      return false;
    }
    if (q === "") return true;
    const haystack = [
      thinker.name,
      thinker.school,
      ...thinker.works,
      ...thinker.ideas,
      ...thinker.quotes,
    ]
      .join(" ")
      .toLowerCase();
    return q.split(/\s+/).every((token) => haystack.includes(token));
  });

  const mastered = THINKERS.filter((t) => statusOf(t.id) === "mastered").length;
  const learning = THINKERS.filter((t) => statusOf(t.id) === "learning").length;

  return (
    <div className="space-y-5">
      <div className="callout text-sm">
        <span aria-hidden className="text-lg leading-6">💡</span>
        <p className="leading-relaxed">
          <span className="font-medium">{mastered}</span> mastered ·{" "}
          <span className="font-medium">{learning}</span> learning ·{" "}
          {THINKERS.length - mastered - learning} not started. Aim to cite 2–3
          thinkers in every PSIR answer — mark a sheet <em>Mastered</em> once you
          can write its ideas, a quote and a critique from memory.
        </p>
      </div>

      {/* Database toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search thinkers, works, ideas…"
            className="h-8 pl-8"
            aria-label="Search thinkers"
          />
        </div>
        <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
          All
        </FilterChip>
        {(Object.keys(THINKER_CATEGORY_META) as ThinkerCategory[]).map((key) => (
          <FilterChip key={key} active={category === key} onClick={() => setCategory(key)}>
            {THINKER_CATEGORY_META[key].label}
          </FilterChip>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <FilterChip active={syllabusOnly} onClick={() => setSyllabusOnly((v) => !v)}>
          Named in syllabus
        </FilterChip>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-7 rounded-md border bg-background px-2 text-xs text-muted-foreground"
        >
          <option value="all">Any status</option>
          <option value="new">Not started</option>
          <option value="learning">Learning</option>
          <option value="mastered">Mastered</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {visible.length} of {THINKERS.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No thinkers match — try a different search or filter.
        </p>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {visible.map((thinker) => (
            <ThinkerCard
              key={thinker.id}
              thinker={thinker}
              open={openId === thinker.id}
              onToggle={() => setOpenId((current) => (current === thinker.id ? null : thinker.id))}
              status={statusOf(thinker.id)}
              onStatus={(status) => setStatus(thinker.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 rounded-full border px-2.5 text-xs transition-colors",
        active
          ? "border-foreground/30 bg-foreground/5 font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ThinkerCard({
  thinker,
  open,
  onToggle,
  status,
  onStatus,
}: {
  thinker: Thinker;
  open: boolean;
  onToggle: () => void;
  status: ThinkerStatus | undefined;
  onStatus: (status: ThinkerStatus | null) => void;
}) {
  return (
    <article
      id={thinker.id}
      className={cn(
        "scroll-mt-20 rounded-lg border bg-card transition-colors",
        open && "md:col-span-2",
        status === "mastered" && "border-success/50",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug">{thinker.name}</h3>
          <p className="text-xs text-muted-foreground">
            {thinker.period} · {thinker.school}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className={cn("tag", CATEGORY_TAG[thinker.category])}>
              {THINKER_CATEGORY_META[thinker.category].label}
            </span>
            {thinker.inSyllabus && <span className="tag tag-red">In syllabus</span>}
          </div>
        </div>
        <select
          aria-label={`${thinker.name} status`}
          value={status ?? ""}
          onChange={(e) =>
            onStatus(e.target.value === "" ? null : (e.target.value as ThinkerStatus))
          }
          className={cn(
            "tag shrink-0 cursor-pointer appearance-none pr-2 outline-none",
            status === "mastered" ? "tag-green" : status === "learning" ? "tag-yellow" : "tag-gray",
          )}
        >
          <option value="">Not started</option>
          <option value="learning">Learning</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>

      <div className="space-y-3 px-4 pb-3 text-sm">
        <ul className="list-disc space-y-1 pl-5 text-foreground/90">
          {(open ? thinker.ideas : thinker.ideas.slice(0, 2)).map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
        {thinker.quotes[0] && (
          <blockquote className="border-l-[3px] border-foreground/70 pl-3 text-[13px] leading-relaxed">
            “{thinker.quotes[0]}”
          </blockquote>
        )}

        {open && (
          <div className="grid gap-4 border-t pt-3 md:grid-cols-2">
            <Block title="Key works">
              <ul className="space-y-0.5">
                {thinker.works.map((work) => (
                  <li key={work}>📘 {work}</li>
                ))}
              </ul>
            </Block>
            <Block title="Critiques — for 'critically examine'">
              {thinker.critiques.length === 0 ? (
                <p className="text-muted-foreground">Mostly cited as an analytical frame.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5">
                  {thinker.critiques.map((critique) => (
                    <li key={critique}>{critique}</li>
                  ))}
                </ul>
              )}
            </Block>
            {thinker.quotes.length > 1 && (
              <Block title="More quotes">
                <div className="space-y-2">
                  {thinker.quotes.slice(1).map((quote) => (
                    <blockquote key={quote} className="border-l-[3px] border-foreground/70 pl-3 text-[13px]">
                      “{quote}”
                    </blockquote>
                  ))}
                </div>
              </Block>
            )}
            <Block title="Use it in">
              <div className="flex flex-wrap gap-1.5">
                {thinker.topicIds.map((topicId) => {
                  const node = getNode(topicId);
                  if (!node) return null;
                  return (
                    <Link
                      key={topicId}
                      href={`/syllabus/${topicId}`}
                      className="tag tag-gray max-w-full hover:opacity-80"
                    >
                      <span className="truncate">
                        {node.title.length > 46 ? `${node.title.slice(0, 44)}…` : node.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Block>
            <div className="callout md:col-span-2">
              <span aria-hidden>✍️</span>
              <p>{thinker.tip}</p>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
      >
        {open ? "Close sheet" : "Open full sheet"}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
