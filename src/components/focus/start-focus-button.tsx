"use client";

import { Play, Timer } from "lucide-react";

import { getNode } from "@/lib/syllabus";
import { useFocusStore } from "@/store/focus-store";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Starts (or shows) a focus session for a planner task or a topic. */
export function StartFocusButton({
  topicId,
  taskId = null,
  minutes,
  label = "Start focus",
  variant = "default",
  size = "sm",
  className,
  iconOnly = false,
}: {
  topicId: string;
  taskId?: string | null;
  minutes: number;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  iconOnly?: boolean;
}) {
  const active = useFocusStore((state) =>
    state.session !== null &&
    (taskId ? state.session.taskId === taskId : state.session.topicId === topicId),
  );
  const start = useFocusStore((state) => state.start);
  const title = getNode(topicId)?.title ?? "Study session";

  if (active) {
    return (
      <Button
        variant="soft"
        size={iconOnly ? "icon" : size}
        className={cn("pointer-events-none", className)}
        aria-label="Focus session running"
      >
        <Timer className="animate-pulse" />
        {!iconOnly && "Focusing…"}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={iconOnly ? "icon" : size}
      className={className}
      aria-label={iconOnly ? `${label}: ${title}` : undefined}
      title={`${minutes}-minute focus timer`}
      onClick={() =>
        start({
          taskId,
          topicId,
          label: title,
          plannedSeconds: minutes * 60,
        })
      }
    >
      <Play />
      {!iconOnly && label}
    </Button>
  );
}
