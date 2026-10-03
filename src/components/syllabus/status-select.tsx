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
            "tag shrink-0 cursor-pointer font-medium transition-opacity hover:opacity-80",
            meta.tag,
            size === "lg" && "h-8 px-2.5 text-sm",
          )}
        >
          <span
            aria-hidden
            className={cn("h-2 w-2 rounded-full", meta.dot)}
          />
          {meta.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
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
