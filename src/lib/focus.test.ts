import { describe, expect, it } from "vitest";

import {
  elapsedSeconds,
  focusProgress,
  formatClock,
  pauseSession,
  remainingSeconds,
  resumeSession,
  startSession,
} from "@/lib/focus";

const T0 = 1_700_000_000_000;

describe("focus session timing", () => {
  const base = startSession(
    { taskId: "t1", topicId: "mains.psir1.concepts.justice", label: "Justice", plannedSeconds: 600 },
    T0,
  );

  it("counts elapsed time while running", () => {
    expect(elapsedSeconds(base, T0)).toBe(0);
    expect(elapsedSeconds(base, T0 + 90_500)).toBe(90);
    expect(remainingSeconds(base, T0 + 90_000)).toBe(510);
    expect(focusProgress(base, T0 + 300_000)).toBeCloseTo(0.5);
  });

  it("freezes while paused and resumes from where it stopped", () => {
    const paused = pauseSession(base, T0 + 120_000);
    expect(paused.runningSince).toBeNull();
    expect(elapsedSeconds(paused, T0 + 999_000)).toBe(120);
    expect(pauseSession(paused, T0 + 500_000)).toBe(paused);
    const resumed = resumeSession(paused, T0 + 300_000);
    expect(elapsedSeconds(resumed, T0 + 330_000)).toBe(150);
    expect(resumeSession(resumed, T0 + 400_000)).toBe(resumed);
  });

  it("goes negative (overtime) past the planned duration and caps progress", () => {
    expect(remainingSeconds(base, T0 + 700_000)).toBe(-100);
    expect(focusProgress(base, T0 + 700_000)).toBe(1);
  });

  it("enforces a one-minute minimum plan", () => {
    expect(startSession({ taskId: null, topicId: "x", label: "x", plannedSeconds: 5 }, T0).plannedSeconds).toBe(60);
  });

  it("formats clocks, including hours and overtime", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(605)).toBe("10:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-70)).toBe("+1:10");
  });
});
