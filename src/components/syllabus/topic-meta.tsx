"use client";

import {
  DIFFICULTY_META,
  getTopicState,
  type Confidence,
  type Difficulty,
} from "@/lib/stages";
import { effectiveEstimate } from "@/lib/planner/workload";
import { formatDateLong } from "@/lib/planner/dates";
import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";

/** Study metadata editor shown on a leaf topic's page. The planner and the
 * future revision engine read these values. */
export function TopicMeta({ topicId }: { topicId: string }) {
  const mounted = useMounted();
  const topic = useAppStore((state) => getTopicState(state.topics, topicId));
  const setTopicMeta = useAppStore((state) => state.setTopicMeta);

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
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="topic-difficulty">Difficulty</Label>
                <NativeSelect
                  id="topic-difficulty"
                  value={topic.difficulty}
                  onChange={(e) =>
                    setTopicMeta(topicId, {
                      difficulty: e.target.value as Difficulty,
                    })
                  }
                >
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
                  <option value="">Default</option>
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
              Planner allots ~{effectiveEstimate(topic)} min for the first
              reading.
              {topic.lastStudiedAt &&
                ` Last studied ${formatDateLong(topic.lastStudiedAt)}.`}
              {topic.revisionCount > 0 &&
                ` Revised ${topic.revisionCount}×.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
