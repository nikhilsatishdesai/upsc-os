import { getBreadcrumbs, getNode, getRoots, isLeaf, getAllNodes } from "@/lib/syllabus";
import {
  getTopicState,
  PLAN_STATE_META,
  STAGE_META,
  type TopicStateMap,
} from "@/lib/stages";
import { summarizeMany } from "@/lib/progress";
import { withPlannerDefaults } from "@/lib/planner/config";
import { addDays, diffDays, todayStr } from "@/lib/planner/dates";
import { effectiveConfidence } from "@/lib/planner/confidence";
import { priorityScore } from "@/lib/planner/priority";
import { resolveTopicIntel, paperShortName } from "@/lib/planner/intel";
import { effectiveEstimate, buildRevisionQueue } from "@/lib/planner/workload";
import { computeForecast } from "@/lib/planner/forecast";
import { studyHealth } from "@/lib/planner/health";
import {
  burnoutIndicator,
  consistency,
  currentStreak,
  fatigueIndicator,
  todaySummary,
  weeklyCompletion,
} from "@/lib/planner/analytics";
import { buildRecommendations } from "@/lib/planner/recommendations";
import { topicTimeline } from "@/lib/knowledge/insights";
import type { PlannedTask, PlannerSettings } from "@/lib/planner/types";
import type {
  CurrentAffair,
  Flashcard,
  Keyword,
  BookReference,
  Pyq,
  QuickNote,
  RichNote,
  TimelineEvent,
} from "@/lib/knowledge/types";
import { estimateTokens, trimToTokenBudget } from "./tokens";

/**
 * The Context Builder — assembles everything the AI needs from the
 * EXISTING engines (syllabus, planner, knowledge) so the user never
 * pastes context by hand. Pure and deterministic: same snapshots in,
 * same bundle out. Sections are added in priority order until the token
 * budget is spent; the overflowing section is trimmed, the rest dropped.
 */

export type ContextSection = {
  label: string;
  text: string;
  tokens: number;
};

export type ContextBundle = {
  sections: ContextSection[];
  totalTokens: number;
  /** Human-readable provenance ("generated from your notes on …"). */
  sources: string[];
};

export type KnowledgeSnapshot = {
  richNotes: Record<string, RichNote>;
  quickNotes: Record<string, QuickNote>;
  flashcards: Record<string, Flashcard>;
  keywords: Record<string, Keyword>;
  bookRefs: Record<string, BookReference>;
  pyqs: Record<string, Pyq>;
  currentAffairs: Record<string, CurrentAffair>;
  events: TimelineEvent[];
};

export type StudySnapshot = {
  topics: TopicStateMap;
  tasks: Record<string, PlannedTask>;
  planner: PlannerSettings | null;
  examDate: string;
  displayName: string;
};

/** Assemble candidate sections into a budget-bounded bundle. */
function assemble(
  candidates: { label: string; text: string; source?: string }[],
  budgetTokens: number,
): ContextBundle {
  const sections: ContextSection[] = [];
  const sources: string[] = [];
  let remaining = budgetTokens;
  for (const candidate of candidates) {
    if (candidate.text.trim() === "" || remaining <= 0) continue;
    const text =
      estimateTokens(candidate.text) > remaining
        ? trimToTokenBudget(candidate.text, remaining)
        : candidate.text;
    const tokens = estimateTokens(text);
    if (tokens === 0) continue;
    sections.push({ label: candidate.label, text, tokens });
    if (candidate.source) sources.push(candidate.source);
    remaining -= tokens;
  }
  return {
    sections,
    totalTokens: sections.reduce((sum, section) => sum + section.tokens, 0),
    sources,
  };
}

/** Render a bundle as the prompt-ready context block. */
export function renderContext(bundle: ContextBundle): string {
  return bundle.sections
    .map((section) => `## ${section.label}\n${section.text}`)
    .join("\n\n");
}

const byTopic = <T extends { topicId: string }>(
  map: Record<string, T>,
  topicId: string,
): T[] =>
  Object.values(map)
    .filter((item) => item.topicId === topicId)
    .sort((a, b) =>
      ((a as { createdAt?: string }).createdAt ?? "").localeCompare(
        (b as { createdAt?: string }).createdAt ?? "",
      ),
    );

/**
 * Everything known about ONE topic: identity, study state, the user's own
 * notes and knowledge entities, and its planner situation.
 */
export function buildTopicContext(input: {
  topicId: string;
  study: StudySnapshot;
  knowledge: KnowledgeSnapshot;
  budgetTokens: number;
  today?: string;
}): ContextBundle {
  const { topicId, study, knowledge } = input;
  const today = input.today ?? todayStr();
  const node = getNode(topicId);
  if (!node) return { sections: [], totalTokens: 0, sources: [] };

  const state = getTopicState(study.topics, topicId);
  const intel = resolveTopicIntel(topicId, state);
  const confidence = effectiveConfidence(topicId, state, today);
  const score = priorityScore(topicId, state, {
    today,
    examDate: study.examDate,
  });

  const crumbs = getBreadcrumbs(topicId)
    .map((crumb) => crumb.title)
    .join(" → ");

  const stateLines = [
    `Stage: ${STAGE_META[state.stage].label} · Scope: ${PLAN_STATE_META[state.planState].label}`,
    `Paper: ${paperShortName(topicId)} · Exam importance: ${intel.priority} · Difficulty: ${intel.difficulty}`,
    `First reading: ${state.studiedMinutes}/${effectiveEstimate(topicId, state)} min · Sessions done: ${state.completedSessions} · Missed: ${state.missedSessions} · Postponed: ${state.postponeCount}×`,
    `Last studied: ${state.lastStudiedAt ?? "never"} · Revisions done: ${state.revisionCount} · Next revision due: ${state.nextRevisionAt ?? "none scheduled"}`,
    `Effective confidence: ${confidence.value.toFixed(1)}/5${confidence.reasons.length > 0 ? ` (${confidence.reasons.join("; ")})` : ""}`,
    `Priority score: ${score.total} (${score.reasons.join("; ")})`,
  ];

  const note = knowledge.richNotes[topicId];
  const quickNotes = byTopic(knowledge.quickNotes, topicId);
  const keywords = byTopic(knowledge.keywords, topicId);
  const cards = byTopic(knowledge.flashcards, topicId);
  const books = byTopic(knowledge.bookRefs, topicId);
  const pyqs = Object.values(knowledge.pyqs)
    .filter(
      (pyq) => pyq.topicId === topicId || pyq.linkedTopicIds.includes(topicId),
    )
    .sort((a, b) => b.year - a.year);
  const affairs = Object.values(knowledge.currentAffairs)
    .filter((affair) => affair.topicIds.includes(topicId))
    .sort((a, b) => b.date.localeCompare(a.date));
  const timeline = topicTimeline(
    topicId,
    knowledge.events,
    Object.values(study.tasks),
    8,
  );

  const sources: string[] = [];
  if (note && note.markdown.trim() !== "") sources.push("your notes");
  if (quickNotes.length > 0) sources.push("quick notes");
  if (keywords.length > 0) sources.push("keywords");
  if (cards.length > 0) sources.push("flashcards");
  if (pyqs.length > 0) sources.push("PYQs");
  if (affairs.length > 0) sources.push("current affairs");

  const bundle = assemble(
    [
      {
        label: "Topic",
        text: `${node.title}\nSyllabus path: ${crumbs}${node.description ? `\n${node.description}` : ""}`,
      },
      { label: "Study state", text: stateLines.join("\n") },
      {
        label: "Notes (the student's own)",
        text: note?.markdown ?? "",
        source: "your notes",
      },
      {
        label: "Quick notes",
        text: quickNotes
          .map((quick) => `- [${quick.kind}] ${quick.text}`)
          .join("\n"),
      },
      {
        label: "Keywords",
        text: keywords
          .map(
            (keyword) =>
              `- ${keyword.term} (${keyword.kind})${keyword.note ? `: ${keyword.note}` : ""}`,
          )
          .join("\n"),
      },
      {
        label: "Existing flashcards",
        text: cards
          .slice(0, 12)
          .map((card) => `- Q: ${card.front} | A: ${card.back}`)
          .join("\n"),
      },
      {
        label: "Book references",
        text: books
          .map(
            (book) =>
              `- ${book.book}${book.chapter ? `, ${book.chapter}` : ""}${book.pages ? ` (p. ${book.pages})` : ""}${book.completed ? " ✓ done" : ""}`,
          )
          .join("\n"),
      },
      {
        label: "Previous year questions",
        text: pyqs
          .slice(0, 8)
          .map(
            (pyq) =>
              `- [${pyq.year} ${pyq.paper}${pyq.marks ? `, ${pyq.marks} marks` : ""}] ${pyq.question}${pyq.solved ? " (solved)" : ""}`,
          )
          .join("\n"),
      },
      {
        label: "Linked current affairs",
        text: affairs
          .slice(0, 6)
          .map(
            (affair) =>
              `- [${affair.date}] ${affair.title}${affair.summary ? ` — ${affair.summary}` : ""}`,
          )
          .join("\n"),
      },
      {
        label: "Recent activity",
        text: timeline
          .map((entry) => `- ${entry.at.slice(0, 10)}: ${entry.label}`)
          .join("\n"),
      },
    ],
    input.budgetTokens,
  );
  // Dedupe provenance while preserving assembly-order sources.
  bundle.sources = [...new Set([...bundle.sources, ...sources])];
  return bundle;
}

export type WeakTopic = {
  topicId: string;
  title: string;
  confidence: number;
  reasons: string[];
};

/** Studied topics with the lowest effective confidence — the honest
 * "where am I weak" list (deterministic scoring, no AI involved). */
export function weakTopics(
  topics: TopicStateMap,
  today: string,
  limit = 5,
): WeakTopic[] {
  const scored: WeakTopic[] = [];
  for (const [topicId, stored] of Object.entries(topics)) {
    const node = getNode(topicId);
    if (!node || !isLeaf(node)) continue;
    const state = getTopicState(topics, topicId);
    if (state.planState === "excluded") continue;
    if (state.stage === "not-started" && state.studiedMinutes === 0) continue;
    void stored;
    const confidence = effectiveConfidence(topicId, state, today);
    scored.push({
      topicId,
      title: node.title,
      confidence: confidence.value,
      reasons: confidence.reasons,
    });
  }
  return scored
    .sort(
      (a, b) =>
        a.confidence - b.confidence || a.topicId.localeCompare(b.topicId),
    )
    .slice(0, limit);
}

export type UpcomingRevision = {
  topicId: string;
  title: string;
  dueDate: string;
  overdueDays: number;
};

/** Revisions due within the window (overdue ones first). */
export function upcomingRevisions(
  topics: TopicStateMap,
  today: string,
  days = 7,
  limit = 8,
): UpcomingRevision[] {
  const byDate = addDays(today, days);
  return buildRevisionQueue(topics, byDate, new Set(), undefined, {
    today,
    examDate: "",
  })
    .slice(0, limit)
    .map((due) => ({
      topicId: due.topicId,
      title: getNode(due.topicId)?.title ?? due.topicId,
      dueDate: due.dueDate,
      overdueDays: Math.max(0, diffDays(due.dueDate, today)),
    }));
}

/**
 * The whole preparation at a glance: progress, forecast, health, burnout,
 * today's plan, weak areas, upcoming revisions, recommendations, scope.
 * Feeds mentor chat, the daily briefing and planner advice.
 */
export function buildStudyContext(input: {
  study: StudySnapshot;
  budgetTokens: number;
  today?: string;
}): ContextBundle {
  const { study } = input;
  const today = input.today ?? todayStr();
  const tasks = Object.values(study.tasks);
  const settings = study.planner ? withPlannerDefaults(study.planner) : null;

  const roots = getRoots().map((root) => root.id);
  const progress = summarizeMany(study.topics, roots);
  const daysToPrelims = study.examDate
    ? diffDays(today, study.examDate)
    : null;
  const daysToMains = settings ? diffDays(today, settings.mainsDate) : null;

  const studentLines = [
    `Name: ${study.displayName || "the aspirant"}`,
    `Today: ${today}`,
    daysToPrelims !== null
      ? `Prelims: ${study.examDate} (${daysToPrelims} days away)`
      : "Prelims date not set",
    daysToMains !== null
      ? `Mains: ${settings!.mainsDate} (${daysToMains} days away)`
      : "Planner not set up yet",
    `Preparation: ${progress.percent}% weighted · ${progress.covered}/${progress.total} topics covered · ${progress.examReady} exam-ready`,
  ];

  const candidates: { label: string; text: string }[] = [
    { label: "Student", text: studentLines.join("\n") },
  ];

  if (settings) {
    const forecast = computeForecast(
      study.topics,
      settings,
      study.examDate,
      today,
      tasks,
    );
    const health = studyHealth({
      tasks,
      topics: study.topics,
      settings,
      examDate: study.examDate,
      today,
    });
    const burnout = burnoutIndicator(tasks, study.topics, settings, today);
    const fatigue = fatigueIndicator(tasks, study.topics, today);
    const week = weeklyCompletion(tasks, today);
    const summary = todaySummary(tasks, today);

    candidates.push({
      label: "Forecast",
      text: [
        `Remaining: ${Math.round(forecast.totalRemainingMinutes / 60)} h (study ${Math.round(forecast.remainingStudyMinutes / 60)} h + revisions ${Math.round(forecast.remainingRevisionMinutes / 60)} h)`,
        `Pace: planned ${forecast.averageDailyMinutes} min/day · observed ${forecast.actualDailyMinutes ?? "n/a"} min/day · effective ${forecast.effectiveDailyMinutes} min/day`,
        `Expected completion: ${forecast.expectedCompletionDate ?? "n/a"} ± ${forecast.confidenceIntervalDays} days · status: ${forecast.paceStatus ?? "n/a"}`,
        `Finish probability: Prelims ${forecast.prelimsProbability ?? "n/a"}% · Mains ${forecast.mainsProbability ?? "n/a"}%`,
        forecast.requiredDailyMinutes !== null
          ? `Required to finish by Prelims: ${forecast.requiredDailyMinutes} min/day`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    candidates.push({
      label: "Health & burnout",
      text: [
        `Study health: ${health.score}/100 (${health.band}) — ${health.components.map((component) => `${component.label} ${component.score}`).join(", ")}`,
        `Burnout indicator: ${burnout.score}/100 (${burnout.level}) · fatigue (behaviour only): ${fatigue.score}/100 (${fatigue.level})`,
        `Streak: ${currentStreak(tasks, today)} days · consistency (30d): ${consistency(tasks, undefined, today)}% · week completion: ${week.completed}/${week.planned} (${week.percent}%)`,
      ].join("\n"),
    });

    const todayTasks = tasks
      .filter((task) => task.date === today && task.status !== "skipped")
      .sort((a, b) => a.slot.localeCompare(b.slot));
    candidates.push({
      label: "Today's plan",
      text: [
        `Planned ${summary.plannedMinutes} min · completed ${summary.completedMinutes} min (${summary.percent}%) · ${summary.pendingCount} sessions pending`,
        ...todayTasks.map(
          (task) =>
            `- [${task.status}] ${task.kind === "revision" ? "Revise" : "Study"} ${getNode(task.topicId)?.title ?? task.topicId} (${task.minutes} min, ${task.slot})`,
        ),
      ].join("\n"),
    });

    const recommendations = buildRecommendations({
      tasks,
      topics: study.topics,
      settings,
      examDate: study.examDate,
      today,
    });
    candidates.push({
      label: "Engine recommendations",
      text: recommendations
        .map((item) => `- [${item.level}] ${item.title} — ${item.why}`)
        .join("\n"),
    });
  }

  candidates.push({
    label: "Weak topics (lowest effective confidence)",
    text: weakTopics(study.topics, today)
      .map(
        (weak) =>
          `- ${weak.title}: ${weak.confidence.toFixed(1)}/5${weak.reasons.length > 0 ? ` (${weak.reasons.join("; ")})` : ""}`,
      )
      .join("\n"),
  });

  candidates.push({
    label: "Upcoming revisions (7 days)",
    text: upcomingRevisions(study.topics, today)
      .map(
        (due) =>
          `- ${due.title} — due ${due.dueDate}${due.overdueDays > 0 ? ` (${due.overdueDays} days overdue)` : ""}`,
      )
      .join("\n"),
  });

  // Scope: counts only (paused/excluded topics are deliberate choices the
  // mentor should respect, not re-litigate).
  let paused = 0;
  let excluded = 0;
  for (const node of getAllNodes()) {
    if (!isLeaf(node)) continue;
    const planState = getTopicState(study.topics, node.id).planState;
    if (planState === "paused") paused += 1;
    else if (planState === "excluded") excluded += 1;
  }
  if (paused > 0 || excluded > 0) {
    candidates.push({
      label: "Study scope",
      text: `${paused} topics paused · ${excluded} topics excluded (user's deliberate scope choices).`,
    });
  }

  return assemble(candidates, input.budgetTokens);
}
