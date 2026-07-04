"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getTopicState,
  STAGE_META,
  STAGE_ORDER,
  type StudyStage,
} from "@/lib/stages";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Study-stage picker for a leaf topic. `size="lg"` renders the prominent
 * picker used on the topic's own page; default is the compact row version.
 */
export function StatusSelect({
  topicId,
  size = "sm",
}: {
  topicId: string;
  size?: "sm" | "lg";
}) {
  const mounted = useMounted();
  const stage = useAppStore((state) =>
    getTopicState(state.topics, topicId).stage,
  );
  const setStage = useAppStore((state) => state.setStage);
  const meta = STAGE_META[mounted ? stage : "not-started"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change study stage (currently ${meta.label})`}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full border bg-card font-medium shadow-sm transition-colors hover:bg-secondary",
            size === "lg" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "rounded-full",
              size === "lg" ? "h-2.5 w-2.5" : "h-2 w-2",
              meta.dot,
            )}
          />
          <span className={meta.text}>{meta.label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Study stage</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={mounted ? stage : "not-started"}
          onValueChange={(value) => setStage(topicId, value as StudyStage)}
        >
          {STAGE_ORDER.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <span
                aria-hidden
                className={cn(
                  "mr-2 h-2 w-2 rounded-full",
                  STAGE_META[value].dot,
                )}
              />
              {STAGE_META[value].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
