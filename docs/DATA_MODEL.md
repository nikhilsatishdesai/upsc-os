# DATA_MODEL.md

> Every persisted object in UPSC OS: fields, relationships, lifecycle.
> Source of truth: `src/lib/stages.ts`, `src/lib/planner/types.ts`,
> `src/lib/knowledge/types.ts`, `src/store/*.ts`. Verified against code
> 2026-07-05.

## 0. Identity: the syllabus topic id

Everything keys off **dotted topic ids** from the authored syllabus
(`src/data/syllabus/`), e.g. `prelims.gs.polity.constitution.fundamental-rights`.

- segment 1 → exam stage (`prelims` | `mains`)
- segments 1–2 → paper (`prelims.gs`, `mains.gs2`, …)
- segments 1–3 → unit = the "subject" bucket used by the scheduler's rotation
- **leaf** nodes (no children) are the only nodes that carry state; 235 exist.
- Ids are permanent. Renaming one orphans progress and knowledge (hard rule).

`lib/syllabus.ts` indexes the tree once at module load into `SyllabusNode`:
`{ id, title, description?, depth, parentId, childIds, leafCount, pathTitles }`.

## 1. TopicState — the Study Topic (app-store `topics`, sparse map)

Only touched topics are stored; `getTopicState(topics, id)` merges
`DEFAULT_TOPIC_STATE` (WeakMap-cached ⇒ stable references — hard rule).
Adding a field = add to type + default; old data backfills automatically.

| Field | Type | Meaning / lifecycle |
|---|---|---|
| `stage` | `"not-started" \| "first-reading" \| "notes-made" \| "revision-1..3" \| "exam-ready"` | Learning lifecycle. Weighted for preparation % (weights in `STAGE_META`: 0/.4/.55/.7/.8/.9/1). Auto-advances: study completion → first-reading; revision completions → revision-N. `notes-made` and `exam-ready` are manual. |
| `studiedMinutes` | number | Minutes accumulated toward the first reading. Reset when stage set back to not-started. |
| `lastStudiedAt` | `YYYY-MM-DD \| null` | Set by any completed session or forward manual stage change. Drives confidence decay. |
| `revisionCount` | number | Completed spaced revisions. Drives ladder + confidence boost. |
| `priority` | `Priority \| null` | User override; `null` = curated intel decides (`critical/high/medium/low`). |
| `difficulty` | `Difficulty \| null` | User override; `null` = curated. Multiplies estimates (×.75/1/1.3). |
| `confidence` | 1–5 | The user's own rating; never mutated by engines. Effective confidence is derived (see §confidence). |
| `estimatedMinutes` | `number \| null` | User override of first-reading minutes; `null` = curated/default (90). |
| `nextRevisionAt` | `YYYY-MM-DD \| null` | When the next spaced revision falls due. Anchored by completions and manual stage changes using `settings.revisionIntervals`. `null` = none pending. |
| `completedSessions` | number | Behaviour history: all completed planner sessions. |
| `missedSessions` | number | Sessions that went `missed` at replan. |
| `postponeCount` | number | Skips + later-moves + misses. Raises dynamic priority; reopening a skip decrements. |
| `planState` | `"included" \| "paused" \| "excluded"` | Study scope. Paused: out of schedule, in forecast. Excluded: out of everything; progress preserved. |

**Relationships**: 1:1 with a syllabus leaf; referenced by PlannedTasks and all
knowledge entities via topic id.

## 2. PlannedTask — a planner session (app-store `tasks`, map by id)

| Field | Type | Meaning |
|---|---|---|
| `id` | string | `makeId()` (uuid or fallback). Split tasks get `-b` suffix siblings. |
| `topicId` | string | Target leaf topic. |
| `date` | `YYYY-MM-DD` | Local calendar day. |
| `slot` | `"morning" \| "afternoon" \| "evening"` | Display slot; start times from settings/config. |
| `minutes` | number | Session length (≥ `minTaskMinutes` 15, ≤ session length). |
| `kind` | `"study" \| "revision"` | Revision tasks are generated from `nextRevisionAt` due dates. New kinds are an extension point. |
| `status` | `"pending" \| "completed" \| "skipped" \| "missed"` | Lifecycle below. |
| `completedAt` | ISO \| null | Set on completion (drives streaks/pace analytics). |
| `createdBy` | `"auto" \| "user"` | Auto tasks are regenerated every replan; user tasks are pinned (moves, splits/merges, manual planning). |

**Lifecycle**: created pending → `completed` (immutable history; updates the
topic: minutes/stage/revision ladder/counters) \| `skipped` (postpone signal,
reopenable) \| `missed` (set by replan when date passes; history + counters;
not reopenable). Pending auto tasks die at every replan; pending user tasks
survive unless topic finished/excluded/paused.

## 3. PlannerSettings (app-store `planner`, null until setup)

`mainsDate`, `dailyHours`, `wakeUpTime`, `studyStartTime`,
`weeklyOffDay (0–6 | -1)`, `maxSessionsPerDay`, `sessionMinutes`
— V2 originals; plus Phase-A additions (defaulted on read via
`withPlannerDefaults`, so pre-A settings never migrate):
`revisionIntervals: number[]` (default [3,10,30]), `maxHardPerDay`,
`morningDifficulty ("hard-first"|"easy-first")`,
`weekendStrategy ("normal"|"light"|"revision-heavy")`,
`vacationFrom/To (date|null)`, `aggressiveness ("relaxed"|"standard"|"intense")`,
`burnoutSensitivity ("low"|"medium"|"high")`.
The **Prelims date is `examDate`** on the store root (shared with Settings page),
not inside PlannerSettings.

## 4. DailySnapshot (app-store `snapshots`, map by date, 60-day retention)

`{ burnoutScore, healthScore|null, remainingMinutes, revisionBacklog }` —
written once per replan day; feeds Analytics trend charts. Idempotent per date.

## 5. Store root (app-store, persist v4)

`topics`, `displayName`, `examDate` (Prelims), `recentTopics[≤8]`, `planner`,
`tasks`, `lastPlannedAt`, `snapshots`, `focusCollectionId (string|null)`.
Migrations: v1 statuses→stages, v2 difficulty-default→null + priority, v3→v4
settings defaults + snapshots init.

## 6. Knowledge entities (knowledge-store, persist v1)

All carry `createdAt` ISO; all validate their `topicId`(s) on import
(sanitizers drop unknown topics — never throw).

### RichNote (`richNotes[topicId]`, one per topic)
`markdown`, `updatedAt`, `versionTimestamps[≤20]` (a new stamp only when >10
min since the last — lightweight history), `ai: NoteAiPlaceholder`
(`summary/quiz/explanation/difficultyEstimate/cleanup`, all null until Phase C).

### QuickNote (`quickNotes[id]`)
`topicId`, `text`, `kind: reminder|mnemonic|trick|hook|definition|formula`.

### Flashcard (`flashcards[id]`)
`topicId`, `front`, `back`, `tags[]`, `difficulty`, `confidence 1–5`,
`lastReviewedAt|null`, `reviewCount`, `correctStreak`, `incorrectStreak`,
`updatedAt`, `ai: object|null` (future SRS/AI slot).
**Review lifecycle**: `reviewFlashcard(id, correct)` → count+1, streaks update,
lastReviewedAt=now, timeline event. "Due" = never reviewed or ≥7 days
(`KNOWLEDGE_CONFIG.flashcardDueAfterDays`). Deliberately independent of the
planner's revision engine.

### Keyword (`keywords[id]`)
`topicId`, `term`, `kind: article|committee|scheme|act|concept|date|report|thinker|case|definition|other`, `note`.

### BookReference (`bookRefs[id]`)
`topicId`, `book`, `chapter`, `pages`, `note`, `completed`, `updatedAt`.

### Resource (`resources[id]`)
`topicId`, `title`, `url` (may be empty for local documents), `kind:
pdf|image|video|youtube|website|drive|document|link`, `note`.

### Pyq (`pyqs[id]`)
`topicId` (primary home) + `linkedTopicIds[]` (appears on those pages too),
`year`, `paper` (free text: "Prelims GS", "GS-II"…), `question`, `marks|null`,
`difficulty`, `attempted`, `solved` (solving logs a timeline event once),
`note`, `expectedAnswer`, `aiExplanation: null` (Phase C), `updatedAt`.

### CurrentAffair (`currentAffairs[id]`)
`topicIds[] (≥1 — genuinely multi-topic)`, `title`, `date`, `source`,
`summary`, `importance: low|medium|high`, `note`, `aiSummary: null`.
Removing from a topic with >1 links = unlink; with 1 link = delete.

### Bookmark (`bookmarks[id]`) & BookmarkCollection (`collections[id]`)
Bookmark: `targetType: topic|note|quick-note|flashcard|pyq|resource|current-affair`,
`targetId`, `topicId` (display context), `collectionId`. One bookmark per
target per collection (deduped). Collection: `name`, `builtin`. Four built-ins
with **fixed ids** (`col-must-revise`, `col-weak-areas`, `col-essay-material`,
`col-interview-notes`) — renameable, not deletable; deleting a custom
collection removes its bookmarks. Collections double as **planner focus
targets** (app-store `focusCollectionId` → restricts fresh study to that
collection's topic bookmarks).

### TimelineEvent (`events[]`, capped 1500 FIFO)
`{ id, topicId, at, type, label }` — types: note-updated, quick-note-added,
flashcard-added/-reviewed, keyword-added, book-added, resource-added,
pyq-added/-solved, current-affair-linked, bookmark-added. The ONLY stored
history in the knowledge store; the UI timeline merges these with completed
planner tasks (types `studied`/`revised`) at read time.

## 7. Derived objects (computed, never persisted)

| Object | Producer | Notes |
|---|---|---|
| `ProgressSummary` | `lib/progress.ts` | percent (stage-weighted), covered, byStage, examReady per subtree |
| `PriorityScore {total, reasons[]}` | `planner/priority.ts` | base + confidence gap + revision urgency + postpones + exam proximity |
| `EffectiveConfidence {value, reasons[]}` | `planner/confidence.ts` | user rating +revisions −idle-decay −postpones −hard handicap, clamped 1–5 |
| `CompletionForecast` | `planner/forecast.ts` | remaining study+revision minutes, weekly/monthly capacity, planned vs observed vs effective daily pace, daysRequired, expectedCompletionDate ± `confidenceIntervalDays`, `prelimsProbability`/`mainsProbability` (logistic over slack), paceStatus, requiredDailyMinutes |
| `BurnoutIndicator` / fatigue | `planner/analytics.ts` | display indicator includes planned load; **fatigue** (streak + completed-hard share only) drives damping & the recommendation |
| `StudyHealth {score, band, components[7]}` | `planner/health.ts` | consistency/completion/revision/burnout⁻¹/confidence/pace/stability, config-weighted |
| `Recommendation {id, level, title, why}` | `planner/recommendations.ts` | rule list, max 5, always explains WHY |
| `TimelineEntry`, `StudyHistoryRow`, `KnowledgeStats` | `knowledge/insights.ts` | merged history, per-topic stats, growth/reading/writing stats |
| `KnowledgeHit` | `knowledge/search.ts` | fuzzy hits across 9 entity types |

## 8. Backup file (format `BACKUP_VERSION = 5`)

```jsonc
{
  "app": "upsc-os", "version": 5, "exportedAt": ISO,
  // app store section (all v4 fields incl. focusCollectionId)
  "topics": {...}, "planner": {...}, "tasks": {...}, "snapshots": {...},
  // knowledge section (entire knowledge store)
  "knowledge": { "richNotes": {...}, ..., "events": [...] }
}
```
`parseExportedState` accepts versions 1–5, migrates v1 statuses, treats v2
"medium" difficulty as auto, fills pre-4 defaults, and sanitizes every
knowledge entity (drop-don't-throw). Import replaces both stores after user
confirmation.
