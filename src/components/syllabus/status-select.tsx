"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUS_META, STATUS_ORDER, type TopicStatus } from "@/lib/status";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Status picker for a leaf topic. `size="lg"` renders the prominent picker
 * used on the topic's own page; default is the compact list-row version.
 */
export function StatusSelect({
  topicId,
  size = "sm",
}: {
  topicId: string;
  size?: "sm" | "lg";
}) {
  const mounted = useMounted();
  const status = useAppStore(
    (state) => state.progress[topicId] ?? "not-started",
  );
  const setStatus = useAppStore((state) => state.setStatus);
  const meta = STATUS_META[mounted ? status : "not-started"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change status (currently ${meta.label})`}
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
        <DropdownMenuRadioGroup
          value={mounted ? status : "not-started"}
          onValueChange={(value) => setStatus(topicId, value as TopicStatus)}
        >
          {STATUS_ORDER.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <span
                aria-hidden
                className={cn(
                  "mr-2 h-2 w-2 rounded-full",
                  STATUS_META[value].dot,
                )}
              />
              {STATUS_META[value].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
