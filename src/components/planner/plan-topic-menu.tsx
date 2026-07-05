"use client";

import * as React from "react";
import { CalendarClock, CalendarPlus, Sunrise, Zap } from "lucide-react";

import {
  getTopicState,
  PLAN_STATE_META,
  PLAN_STATES,
  type PlanState,
} from "@/lib/stages";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Manual planning + scope control for one topic, on its own page. */
export function PlanTopicMenu({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const planner = useAppStore((state) => state.planner);
  const planState = useAppStore(
    (state) => getTopicState(state.topics, topicId).planState,
  );
  const planTopicNow = useAppStore((state) => state.planTopicNow);
  const setPlanState = useAppStore((state) => state.setPlanState);
  const [confirmation, setConfirmation] = React.useState<string | null>(null);

  if (!mounted || !planner) return null;

  const plan = (when: "today" | "tomorrow" | "this-week", label: string) => {
    planTopicNow(topicId, when);
    setConfirmation(label);
    setTimeout(() => setConfirmation(null), 2500);
  };

  return (
    <div className="flex items-center gap-2">
      {confirmation && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">
          Planned for {confirmation}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <CalendarPlus /> Plan
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Add a study session</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => plan("today", "today")}>
            <Zap /> Study today
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => plan("tomorrow", "tomorrow")}>
            <Sunrise /> Study tomorrow
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => plan("this-week", "this week")}>
            <CalendarClock /> Sometime this week
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Planning state</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={planState}
            onValueChange={(value) => setPlanState(topicId, value as PlanState)}
          >
            {PLAN_STATES.map((state) => (
              <DropdownMenuRadioItem key={state} value={state}>
                <span
                  aria-hidden
                  className={cn(
                    "mr-2 h-2 w-2 rounded-full",
                    PLAN_STATE_META[state].dot,
                  )}
                />
                {PLAN_STATE_META[state].label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
