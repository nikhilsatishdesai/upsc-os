"use client";

import { useAppStore } from "@/store/app-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSettings() {
  const mounted = useMounted();
  const displayName = useAppStore((state) => state.displayName);
  const examDate = useAppStore((state) => state.examDate);
  const setDisplayName = useAppStore((state) => state.setDisplayName);
  const setExamDate = useAppStore((state) => state.setExamDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>
          Saved automatically on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!mounted ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Your name</Label>
              <Input
                id="display-name"
                value={displayName}
                maxLength={40}
                placeholder="How should we greet you?"
                onChange={(e) => setDisplayName(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-date">Target exam date</Label>
              <Input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">
                Usually the date of the upcoming Prelims. Powers the dashboard
                countdown.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
