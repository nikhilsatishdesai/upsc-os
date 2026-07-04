"use client";

import {
  DIFFICULTY_META,
  PRIORITY_META,
  PRIORITY_ORDER,
  getTopicState,
  type Confidence,
  type Difficulty,
  type Priority,
} from "@/lib/stages";
import { curatedTopicIntel } from "@/lib/planner/intel";
import { effectiveEstimate } from "@/lib/planner/workload";
import { formatDateLong } from "@/lib/planner/dates";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Study intelligence editor for a leaf topic. "Auto" values come from the
 * curated exam-intelligence layer; anything the user picks overrides it.
 */
export function TopicMeta({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const topic = useAppStore((state) => getTopicState(state.topics, topicId));
  const setTopicMeta = useAppStore((state) => state.setTopicMeta);

  const auto = curatedTopicIntel(topicId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Study settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="topic-priority">Priority</Label>
                <NativeSelect
                  id="topic-priority"
                  value={topic.priority ?? ""}
                  onChange={(e) =>
                    setTopicMeta(topicId, {
                      priority:
                        e.target.value === ""
                          ? null
                          : (e.target.value as Priority),
                    })
                  }
                >
                  <option value="">
                    Auto — {PRIORITY_META[auto.priority].label}
                  </option>
                  {PRIORITY_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {PRIORITY_META[value].label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic-difficulty">Difficulty</Label>
                <NativeSelect
                  id="topic-difficulty"
                  value={topic.difficulty ?? ""}
                  onChange={(e) =>
                    setTopicMeta(topicId, {
                      difficulty:
                        e.target.value === ""
                          ? null
                          : (e.target.value as Difficulty),
                    })
                  }
                >
                  <option value="">
                    Auto — {DIFFICULTY_META[auto.difficulty].label}
                  </option>
                  {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic-confidence">Confidence</Label>
                <NativeSelect
                  id="topic-confidence"
                  value={String(topic.confidence)}
                  onChange={(e) =>
                    setTopicMeta(topicId, {
                      confidence: Number(e.target.value) as Confidence,
                    })
                  }
                >
                  <option value="1">1 — Very low</option>
                  <option value="2">2 — Low</option>
                  <option value="3">3 — Medium</option>
                  <option value="4">4 — High</option>
                  <option value="5">5 — Very high</option>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic-minutes">Study time</Label>
                <NativeSelect
                  id="topic-minutes"
                  value={String(topic.estimatedMinutes ?? "")}
                  onChange={(e) =>
                    setTopicMeta(topicId, {
                      estimatedMinutes:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
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
                </NativeSelect>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Planner allots ~{effectiveEstimate(topicId, topic)} min for the
              first reading; each spaced revision ≈
              {Math.round(auto.revisionWeight * 100)}% of that.
              {topic.lastStudiedAt &&
                ` Last studied ${formatDateLong(topic.lastStudiedAt)}.`}
              {topic.revisionCount > 0 && ` Revised ${topic.revisionCount}×.`}
              {topic.nextRevisionAt &&
                ` Next revision due ${formatDateLong(topic.nextRevisionAt)}.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
