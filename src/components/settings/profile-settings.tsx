"use client";

import { useAppStore } from "@/store/app-store";
import { usePrefsStore, type OptionalSubject } from "@/store/prefs-store";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const THIS_YEAR = new Date().getFullYear();
const ATTEMPT_YEARS = Array.from({ length: 7 }, (_, index) => THIS_YEAR + index);

/** "About you": name, target attempt, exam dates and optional subject. */
export function ProfileSettings() {
  const mounted = useMounted();
  const displayName = useAppStore((state) => state.displayName);
  const examDate = useAppStore((state) => state.examDate);
  const planner = useAppStore((state) => state.planner);
  const setDisplayName = useAppStore((state) => state.setDisplayName);
  const setExamDate = useAppStore((state) => state.setExamDate);
  const patchPlanner = useAppStore((state) => state.patchPlanner);
  const setPlanStateForSubtree = useAppStore((state) => state.setPlanStateForSubtree);
  const attemptYear = usePrefsStore((state) => state.attemptYear);
  const setAttemptYear = usePrefsStore((state) => state.setAttemptYear);
  const optional = usePrefsStore((state) => state.optionalSubject);
  const setOptional = usePrefsStore((state) => state.setOptionalSubject);

  const chooseOptional = (next: OptionalSubject) => {
    if (next === optional) return;
    setOptional(next);
    // PSIR topics leave (or rejoin) the plan, forecast and progress scope.
    const planState = next === "psir" ? "included" : "excluded";
    setPlanStateForSubtree("mains.psir1", planState);
    setPlanStateForSubtree("mains.psir2", planState);
  };

  return (
    <Card id="profile">
      <CardHeader>
        <CardTitle className="text-base">👤 About you</CardTitle>
        <CardDescription>Saved automatically on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!mounted ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="display-name">Your name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  maxLength={40}
                  placeholder="How should we greet you?"
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="attempt-year">Target attempt</Label>
                <NativeSelect
                  id="attempt-year"
                  value={attemptYear === null ? "" : String(attemptYear)}
                  onChange={(e) =>
                    setAttemptYear(e.target.value === "" ? null : Number(e.target.value))
                  }
                >
                  <option value="">Not set</option>
                  {ATTEMPT_YEARS.map((year) => (
                    <option key={year} value={year}>
                      CSE {year}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exam-date">Target Prelims date</Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mains-date">Target Mains date</Label>
                <Input
                  id="mains-date"
                  type="date"
                  value={planner?.mainsDate ?? ""}
                  disabled={!planner}
                  onChange={(e) => e.target.value && patchPlanner({ mainsDate: e.target.value })}
                />
                {!planner && (
                  <p className="text-xs text-muted-foreground">Set when you build your plan.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Optional subject</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <OptionCard
                  active={optional === "psir"}
                  onClick={() => chooseOptional("psir")}
                  emoji="🏛️"
                  title="PSIR"
                  detail="Political Science & IR — full syllabus, thinkers, booklist and answer bank built in."
                />
                <OptionCard
                  active={optional === "other"}
                  onClick={() => chooseOptional("other")}
                  emoji="📘"
                  title="Another optional"
                  detail="Hides PSIR and removes its topics from your plan and progress (your PSIR data is kept)."
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OptionCard({
  active,
  onClick,
  emoji,
  title,
  detail,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex gap-3 rounded-lg border p-3 text-left transition-colors",
        active ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:bg-secondary/60",
      )}
    >
      <span aria-hidden className="text-xl leading-none">{emoji}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}
