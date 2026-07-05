"use client";

import * as React from "react";
import { ChevronDown, Crosshair } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getTopicState,
  PLAN_STATE_META,
  PLAN_STATES,
  type PlanState,
} from "@/lib/stages";
import {
  getChildren,
  getLeafIds,
  getNode,
  getStages,
  isLeaf,
  type SyllabusNode,
} from "@/lib/syllabus";
import { useAppStore } from "@/store/app-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";

type ScopeCounts = { included: number; paused: number; excluded: number };

function useScopeCounts(nodeId: string): ScopeCounts {
  const topics = useAppStore((state) => state.topics);
  return React.useMemo(() => {
    const counts: ScopeCounts = { included: 0, paused: 0, excluded: 0 };
    for (const leafId of getLeafIds(nodeId)) {
      counts[getTopicState(topics, leafId).planState] += 1;
    }
    return counts;
  }, [topics, nodeId]);
}

function CountChips({ counts }: { counts: ScopeCounts }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
      {PLAN_STATES.map((state) =>
        counts[state] > 0 ? (
          <span key={state} className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className={cn("h-1.5 w-1.5 rounded-full", PLAN_STATE_META[state].dot)}
            />
            {counts[state]}
          </span>
        ) : null,
      )}
    </span>
  );
}

/** Compact Include / Pause / Exclude control. */
function PlanStateButtons({
  value,
  onChange,
  label,
}: {
  /** null = mixed/bulk (no single active state). */
  value: PlanState | null;
  onChange: (state: PlanState) => void;
  label: string;
}) {
  return (
    <span
      role="group"
      aria-label={`Planning state for ${label}`}
      className="inline-flex shrink-0 rounded-md border bg-secondary/40 p-0.5"
    >
      {PLAN_STATES.map((state) => (
        <button
          key={state}
          type="button"
          aria-pressed={value === state}
          onClick={() => onChange(state)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
            value === state
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {PLAN_STATE_META[state].label}
        </button>
      ))}
    </span>
  );
}

/** Study Scope: what the planner may schedule. */
export function ScopeView() {
  const focusCollectionId = useAppStore((state) => state.focusCollectionId);
  const setFocusCollection = useAppStore((state) => state.setFocusCollection);
  const collections = useKnowledgeStore((state) => state.collections);
  const bookmarks = useKnowledgeStore((state) => state.bookmarks);

  const collectionOptions = React.useMemo(() => {
    const topicCounts = new Map<string, number>();
    for (const bookmark of Object.values(bookmarks)) {
      if (bookmark.targetType !== "topic") continue;
      topicCounts.set(
        bookmark.collectionId,
        (topicCounts.get(bookmark.collectionId) ?? 0) + 1,
      );
    }
    return Object.values(collections)
      .map((collection) => ({
        ...collection,
        topicCount: topicCounts.get(collection.id) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collections, bookmarks]);

  const focused = focusCollectionId
    ? collectionOptions.find((option) => option.id === focusCollectionId)
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Crosshair className="h-4 w-4" /> Focus collection
          </CardTitle>
          <CardDescription>
            Point fresh study at one collection (e.g. Weak Topics before
            Prelims). Revisions always cover everything included. Add topics
            to collections with the bookmark star on any topic page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <NativeSelect
            aria-label="Focus collection"
            value={focusCollectionId ?? ""}
            onChange={(event) =>
              setFocusCollection(event.target.value || null)
            }
            className="max-w-sm"
          >
            <option value="">Whole included scope (default)</option>
            {collectionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.topicCount} topic
                {option.topicCount === 1 ? "" : "s"})
              </option>
            ))}
          </NativeSelect>
          {focused && focused.topicCount === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              “{focused.name}” has no topics yet — the planner will schedule
              revisions only until you star some topics into it.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {getStages().map(({ stage, papers }) => (
          <section key={stage.id} className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {stage.title}
            </h3>
            {papers.map((paper) => (
              <PaperScope key={paper.id} paper={paper} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function PaperScope({ paper }: { paper: SyllabusNode }) {
  const [open, setOpen] = React.useState(false);
  const counts = useScopeCounts(paper.id);
  const setPlanStateForSubtree = useAppStore(
    (state) => state.setPlanStateForSubtree,
  );
  const uniform =
    (["included", "paused", "excluded"] as PlanState[]).find(
      (state) => counts[state] === paper.leafCount,
    ) ?? null;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Expand ${paper.title}`}
          onClick={() => setOpen((current) => !current)}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-secondary"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {paper.title}
        </span>
        <CountChips counts={counts} />
        <PlanStateButtons
          value={uniform}
          onChange={(state) => setPlanStateForSubtree(paper.id, state)}
          label={paper.title}
        />
      </div>
      {open && (
        <div className="space-y-1 border-t px-3 py-2">
          {getChildren(paper.id).map((child) =>
            isLeaf(child) ? (
              <TopicScopeRow key={child.id} node={child} />
            ) : (
              <UnitScope key={child.id} unit={child} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function UnitScope({ unit }: { unit: SyllabusNode }) {
  const [open, setOpen] = React.useState(false);
  const counts = useScopeCounts(unit.id);
  const setPlanStateForSubtree = useAppStore(
    (state) => state.setPlanStateForSubtree,
  );
  const uniform =
    (["included", "paused", "excluded"] as PlanState[]).find(
      (state) => counts[state] === unit.leafCount,
    ) ?? null;

  return (
    <div>
      <div className="flex items-center gap-2 py-1">
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Expand ${unit.title}`}
          onClick={() => setOpen((current) => !current)}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-secondary"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm">{unit.title}</span>
        <CountChips counts={counts} />
        <PlanStateButtons
          value={uniform}
          onChange={(state) => setPlanStateForSubtree(unit.id, state)}
          label={unit.title}
        />
      </div>
      {open && (
        <div className="space-y-0.5 pb-1 pl-6">
          {getLeafIds(unit.id).map((leafId) => (
            <TopicScopeRow key={leafId} topicId={leafId} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicScopeRow({
  node,
  topicId,
}: {
  node?: SyllabusNode;
  topicId?: string;
}) {
  const id = node?.id ?? topicId!;
  const title = (node ?? getNode(id))?.title ?? id;
  const planState = useAppStore(
    (state) => getTopicState(state.topics, id).planState,
  );
  const setPlanState = useAppStore((state) => state.setPlanState);

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          PLAN_STATE_META[planState].dot,
        )}
      />
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {title}
      </span>
      <PlanStateButtons
        value={planState}
        onChange={(state) => setPlanState(id, state)}
        label={title}
      />
    </div>
  );
}
