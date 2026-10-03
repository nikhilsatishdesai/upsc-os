/**
 * Focus-session timing — pure functions over a pausable stopwatch. A
 * session stores accumulated seconds from finished segments plus the
 * start of the running segment, so it survives reloads and navigation
 * without a ticking value in storage.
 */

export type FocusSession = {
  /** Planner task this session works on (null = free focus on a topic). */
  taskId: string | null;
  topicId: string;
  label: string;
  plannedSeconds: number;
  /** Epoch ms when the current running segment began; null = paused. */
  runningSince: number | null;
  /** Seconds banked from earlier (paused) segments. */
  accumulatedSeconds: number;
  /** Epoch ms of the very first start — for display. */
  startedAt: number;
};

export function startSession(
  input: Pick<FocusSession, "taskId" | "topicId" | "label" | "plannedSeconds">,
  now: number,
): FocusSession {
  return {
    ...input,
    plannedSeconds: Math.max(60, Math.round(input.plannedSeconds)),
    runningSince: now,
    accumulatedSeconds: 0,
    startedAt: now,
  };
}

export function elapsedSeconds(session: FocusSession, now: number): number {
  const running =
    session.runningSince === null
      ? 0
      : Math.max(0, (now - session.runningSince) / 1000);
  return Math.floor(session.accumulatedSeconds + running);
}

export function pauseSession(session: FocusSession, now: number): FocusSession {
  if (session.runningSince === null) return session;
  return {
    ...session,
    accumulatedSeconds: elapsedSeconds(session, now),
    runningSince: null,
  };
}

export function resumeSession(session: FocusSession, now: number): FocusSession {
  if (session.runningSince !== null) return session;
  return { ...session, runningSince: now };
}

/** Seconds left (negative once the planned time is exceeded). */
export function remainingSeconds(session: FocusSession, now: number): number {
  return session.plannedSeconds - elapsedSeconds(session, now);
}

export function focusProgress(session: FocusSession, now: number): number {
  return Math.min(1, elapsedSeconds(session, now) / session.plannedSeconds);
}

/** "12:05" or "+3:10" when overtime. */
export function formatClock(seconds: number): string {
  const overtime = seconds < 0;
  const total = Math.abs(Math.trunc(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const body =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  return overtime ? `+${body}` : body;
}
