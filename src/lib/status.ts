/** Study status of a leaf topic. "not-started" is the implicit default and is never stored. */
export type TopicStatus = "not-started" | "in-progress" | "completed" | "revised";

export const STATUS_ORDER: TopicStatus[] = [
  "not-started",
  "in-progress",
  "completed",
  "revised",
];

export const STATUS_META: Record<
  TopicStatus,
  { label: string; dot: string; text: string }
> = {
  "not-started": {
    label: "Not started",
    dot: "bg-muted-foreground/30",
    text: "text-muted-foreground",
  },
  "in-progress": {
    label: "In progress",
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  revised: {
    label: "Revised",
    dot: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
  },
};

export function isTopicStatus(value: unknown): value is TopicStatus {
  return (
    typeof value === "string" && STATUS_ORDER.includes(value as TopicStatus)
  );
}
