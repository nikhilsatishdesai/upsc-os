"use client";

import {
  CalendarClock,
  CircleDot,
  Clock3,
  FileText,
  Flag,
  Gauge,
  History,
  Mountain,
  type LucideIcon,
} from "lucide-react";

import {
  DIFFICULTY_META,
  PRIORITY_META,
  PRIORITY_ORDER,
  getTopicState,
  type Confidence,
  type Difficulty,
  type Priority,
} from "@/lib/stages";
import { curatedTopicIntel, paperShortName, subjectNameOf } from "@/lib/planner/intel";
import { effectiveEstimate } from "@/lib/planner/workload";
import { formatDateLong } from "@/lib/planner/dates";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusSelect } from "@/components/syllabus/status-select";
import { cn } from "@/lib/utils";

/**
 * The topic's Notion-style property block. "Auto" values come from the
 * curated exam-intelligence layer; anything the user picks overrides it.
 */
export function TopicMeta({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const topic = useAppStore((state) => getTopicState(state.topics, topicId));
  const setTopicMeta = useAppStore((state) => state.setTopicMeta);
  const auto = curatedTopicIntel(topicId);

  if (!mounted) return <Skeleton className="h-48 w-full max-w-xl" />;

  const priority = topic.priority ?? auto.priority;

  return (
    <div className="max-w-2xl space-y-px text-sm">
      <Property icon={CircleDot} label="Status">
        <StatusSelect topicId={topicId} />
      </Property>
      <Property icon={FileText} label="Paper">
        <span className="tag tag-gray">{paperShortName(topicId)}</span>
        <span className="ml-2 text-muted-foreground">{subjectNameOf(topicId)}</span>
      </Property>
      <Property icon={Flag} label="Priority">
        <GhostSelect
          ariaLabel="Priority"
          tagClass={PRIORITY_META[priority].badge}
          value={topic.priority ?? ""}
          onChange={(value) =>
            setTopicMeta(topicId, { priority: value === "" ? null : (value as Priority) })
          }
        >
          <option value="">Auto — {PRIORITY_META[auto.priority].label}</option>
          {PRIORITY_ORDER.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_META[value].label}
            </option>
          ))}
        </GhostSelect>
      </Property>
      <Property icon={Mountain} label="Difficulty">
        <GhostSelect
          ariaLabel="Difficulty"
          value={topic.difficulty ?? ""}
          onChange={(value) =>
            setTopicMeta(topicId, { difficulty: value === "" ? null : (value as Difficulty) })
          }
        >
          <option value="">Auto — {DIFFICULTY_META[auto.difficulty].label}</option>
          {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </GhostSelect>
      </Property>
      <Property icon={Gauge} label="Confidence">
        <GhostSelect
          ariaLabel="Confidence"
          value={String(topic.confidence)}
          onChange={(value) => setTopicMeta(topicId, { confidence: Number(value) as Confidence })}
        >
          <option value="1">1 — Very low</option>
          <option value="2">2 — Low</option>
          <option value="3">3 — Medium</option>
          <option value="4">4 — High</option>
          <option value="5">5 — Very high</option>
        </GhostSelect>
      </Property>
      <Property icon={Clock3} label="Study time">
        <GhostSelect
          ariaLabel="Study time"
          value={String(topic.estimatedMinutes ?? "")}
          onChange={(value) =>
            setTopicMeta(topicId, { estimatedMinutes: value === "" ? null : Number(value) })
          }
        >
          <option value="">Auto — {auto.estimatedMinutes} min</option>
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
          <option value="180">3 hours</option>
          <option value="240">4 hours</option>
        </GhostSelect>
        <span className="ml-2 text-xs text-muted-foreground">
          planner allots ~{effectiveEstimate(topicId, topic)} min · revision ≈
          {Math.round(auto.revisionWeight * 100)}%
        </span>
      </Property>
      <Property icon={History} label="Last studied">
        <span className={cn(!topic.lastStudiedAt && "text-muted-foreground")}>
          {topic.lastStudiedAt ? formatDateLong(topic.lastStudiedAt) : "Empty"}
          {topic.revisionCount > 0 && (
            <span className="text-muted-foreground"> · revised {topic.revisionCount}×</span>
          )}
        </span>
      </Property>
      <Property icon={CalendarClock} label="Next revision">
        <span className={cn(!topic.nextRevisionAt && "text-muted-foreground")}>
          {topic.nextRevisionAt ? formatDateLong(topic.nextRevisionAt) : "Empty"}
        </span>
      </Property>
    </div>
  );
}

function Property({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[34px] items-center gap-2">
      <div className="flex w-36 shrink-0 items-center gap-2 text-muted-foreground sm:w-40">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center rounded-md px-1.5 py-1 hover:bg-secondary/60">
        {children}
      </div>
    </div>
  );
}

/** A borderless select that looks like a Notion property value. */
function GhostSelect({
  ariaLabel,
  value,
  onChange,
  tagClass,
  children,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  tagClass?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "max-w-full cursor-pointer appearance-none rounded bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tagClass && cn("tag pr-1.5", tagClass),
      )}
    >
      {children}
    </select>
  );
}
