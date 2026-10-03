"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  GripVertical,
  Lightbulb,
  MoreVertical,
  RotateCcw,
  Scissors,
  SkipForward,
  Merge,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getNode } from "@/lib/syllabus";
import {
  getTopicState,
  PRIORITY_META,
  STAGE_META,
  DIFFICULTY_META,
} from "@/lib/stages";
import { PLANNER_CONFIG, withPlannerDefaults } from "@/lib/planner/config";
import { todayStr } from "@/lib/planner/dates";
import { explainTask } from "@/lib/planner/explain";
import { paperShortName, resolveTopicIntel, subjectNameOf } from "@/lib/planner/intel";
import type { PlannedTask } from "@/lib/planner/types";
import { tomorrowStr, useAppStore } from "@/store/app-store";
import { StartFocusButton } from "@/components/focus/start-focus-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** "Why this session?" — the planner explanation engine's output. */
function WhyDialog({
  open,
  onOpenChange,
  task,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PlannedTask;
  title: string;
}) {
  const topics = useAppStore((state) => state.topics);
  const storedPlanner = useAppStore((state) => state.planner);
  const examDate = useAppStore((state) => state.examDate);

  const reasons = React.useMemo(() => {
    if (!open || !storedPlanner) return [];
    return explainTask(
      task,
      topics,
      withPlannerDefaults(storedPlanner),
      examDate,
    );
  }, [open, task, topics, storedPlanner, examDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why “{title}”?</DialogTitle>
          <DialogDescription>
            Every session has reasons — nothing in the plan is random.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

const statusStyles: Record<PlannedTask["status"], string> = {
  pending: "",
  completed: "opacity-60",
  skipped: "opacity-45",
  missed: "opacity-60",
};

/** One planned task. `compact` is the week-view variant. */
export function TaskCard({
  task,
  siblings,
  compact = false,
}: {
  task: PlannedTask;
  /** Other pending tasks on the same date (for merge detection). */
  siblings: PlannedTask[];
  compact?: boolean;
}) {
  const completeTask = useAppStore((state) => state.completeTask);
  const skipTask = useAppStore((state) => state.skipTask);
  const reopenTask = useAppStore((state) => state.reopenTask);
  const moveTask = useAppStore((state) => state.moveTask);
  const splitTask = useAppStore((state) => state.splitTask);
  const mergeTasks = useAppStore((state) => state.mergeTasks);
  const topic = useAppStore((state) =>
    getTopicState(state.topics, task.topicId),
  );

  const [moveDialogOpen, setMoveDialogOpen] = React.useState(false);
  const [whyOpen, setWhyOpen] = React.useState(false);
  const [moveDate, setMoveDate] = React.useState(tomorrowStr());

  const node = getNode(task.topicId);
  if (!node) return null;

  const intel = resolveTopicIntel(task.topicId, topic);
  const isRevision = task.kind === "revision";
  const pending = task.status === "pending";
  const mergeTarget = siblings.find(
    (sibling) =>
      sibling.id !== task.id &&
      sibling.topicId === task.topicId &&
      sibling.status === "pending",
  );

  return (
    <div
      draggable={pending}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-card transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        pending && "cursor-grab hover:border-primary/40 active:cursor-grabbing",
        statusStyles[task.status],
      )}
    >
      {pending && !compact && (
        <GripVertical
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground/50"
        />
      )}

      {pending ? (
        <button
          type="button"
          aria-label={`Mark "${node.title}" completed`}
          onClick={() => completeTask(task.id)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
        >
          <CircleCheck className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </button>
      ) : (
        <Check
          aria-hidden
          className={cn(
            "shrink-0",
            compact ? "h-4 w-4" : "h-5 w-5",
            task.status === "completed"
              ? "text-emerald-500"
              : "text-muted-foreground/40",
          )}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {compact && (
            <span
              aria-hidden
              title={`${PRIORITY_META[intel.priority].label} priority`}
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                PRIORITY_META[intel.priority].dot,
              )}
            />
          )}
          <Link
            href={`/syllabus/${task.topicId}`}
            className={cn(
              "block truncate font-medium hover:text-primary",
              compact ? "text-xs" : "text-sm",
              task.status === "completed" && "line-through decoration-1",
            )}
          >
            {node.title}
          </Link>
          {isRevision && (
            <span
              className={cn(
                "tag tag-purple shrink-0 px-1 font-medium",
                compact ? "text-[9px] leading-4" : "text-[10px] leading-4",
              )}
            >
              {compact ? "R" : `Revision ${Math.min(topic.revisionCount + 1, 3)}`}
            </span>
          )}
          {!compact && (
            <span
              className={cn(
                "tag shrink-0 px-1 text-[10px] font-medium leading-4",
                PRIORITY_META[intel.priority].badge,
              )}
            >
              {PRIORITY_META[intel.priority].label}
            </span>
          )}
        </div>
        {!compact && (
          <p className="truncate text-xs text-muted-foreground">
            {paperShortName(task.topicId)} · {subjectNameOf(task.topicId)} ·{" "}
            {STAGE_META[topic.stage].label} ·{" "}
            {DIFFICULTY_META[intel.difficulty].label}
            {isRevision &&
              topic.nextRevisionAt &&
              pending &&
              ` · due ${topic.nextRevisionAt <= todayStr() ? "today" : topic.nextRevisionAt}`}
          </p>
        )}
      </div>

      <span
        className={cn(
          "shrink-0 tabular-nums text-muted-foreground",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {task.status === "skipped"
          ? "Skipped"
          : task.status === "missed"
            ? "Missed"
            : `${task.minutes} min`}
      </span>

      {pending && !compact && task.date === todayStr() && (
        <StartFocusButton
          topicId={task.topicId}
          taskId={task.id}
          minutes={task.minutes}
          iconOnly
          variant="ghost"
          className="h-7 w-7 shrink-0"
        />
      )}

      {(pending || task.status === "completed" || task.status === "skipped") && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Task actions"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setWhyOpen(true)}>
              <Lightbulb /> Why this session?
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {pending ? (
              <>
                <DropdownMenuItem onClick={() => completeTask(task.id)}>
                  <CircleCheck /> Mark completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => skipTask(task.id)}>
                  <SkipForward /> Skip
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => moveTask(task.id, tomorrowStr())}
                >
                  <ArrowRight /> Move to tomorrow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMoveDialogOpen(true)}>
                  <CalendarDays /> Move to date…
                </DropdownMenuItem>
                {task.minutes >= PLANNER_CONFIG.minTaskMinutes * 2 && (
                  <DropdownMenuItem onClick={() => splitTask(task.id)}>
                    <Scissors /> Split in two
                  </DropdownMenuItem>
                )}
                {mergeTarget && (
                  <DropdownMenuItem
                    onClick={() => mergeTasks(task.id, mergeTarget.id)}
                  >
                    <Merge /> Merge with other session
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <DropdownMenuItem onClick={() => reopenTask(task.id)}>
                <RotateCcw /> Reopen
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <WhyDialog
        open={whyOpen}
        onOpenChange={setWhyOpen}
        task={task}
        title={node.title}
      />

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move task</DialogTitle>
            <DialogDescription>
              Pick a new date for “{node.title}”. Moved tasks are pinned —
              replanning never touches them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`move-date-${task.id}`}>New date</Label>
            <Input
              id={`move-date-${task.id}`}
              type="date"
              min={todayStr()}
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                moveTask(task.id, moveDate);
                setMoveDialogOpen(false);
              }}
            >
              Move task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
