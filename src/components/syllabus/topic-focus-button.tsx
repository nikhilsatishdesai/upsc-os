"use client";

import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { StartFocusButton } from "@/components/focus/start-focus-button";

const DEFAULT_FOCUS_MINUTES = 45;

/** "Focus now" on a topic page — uses the planner's session length. */
export function TopicFocusButton({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const sessionMinutes = useAppStore(
    (state) => state.planner?.sessionMinutes ?? DEFAULT_FOCUS_MINUTES,
  );
  if (!mounted) return null;
  return (
    <StartFocusButton
      topicId={topicId}
      minutes={sessionMinutes}
      label="Start focus"
      size="sm"
    />
  );
}
