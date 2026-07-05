# SYSTEM_ARCHITECTURE.md

> The complete architecture of UPSC OS as implemented (2026-07-05).
> All diagrams are Mermaid. Nothing here is aspirational — every box exists in
> the codebase today.

## 1. Bird's-eye view

```mermaid
flowchart TB
    subgraph UI["UI (Next.js App Router, all pages statically generated)"]
        Landing["/ landing"]
        Dash["/dashboard"]
        Plan["/planner (Today · Week · Scope · Analytics)"]
        Syl["/syllabus + /syllabus/[id] (296 SSG pages)"]
        Set["/settings"]
        Palette["Ctrl+K search palette (global)"]
    end

    subgraph Stores["Persisted stores (zustand + localStorage)"]
        AS["app-store — 'upsc-os-store' v4\ntopics · tasks · planner settings\nsnapshots · focusCollection"]
        KS["knowledge-store — 'upsc-os-knowledge' v1\nnotes · cards · keywords · books\nresources · pyqs · affairs · bookmarks · events"]
    end

    subgraph Engine["Planner engine (pure services, src/lib/planner)"]
        SCHED["scheduler"]
        WORK["workload"]
        CAP["capacity"]
        PRIO["priority"]
        CONF["confidence"]
        INTEL["intel (curated)"]
        FC["forecast"]
        AN["analytics + burnout/fatigue"]
        REC["recommendations"]
        HEALTH["health"]
        EXPL["explain"]
        CFG["config (all tunables)"]
    end

    subgraph KEngine["Knowledge services (src/lib/knowledge)"]
        NOTES["notes (counts, snippets)"]
        KSEARCH["search (fuzzy)"]
        KINS["insights (due cards, history, timeline, stats)"]
        KCFG["config"]
    end

    SYLL["lib/syllabus (indexed tree)\n◄ data/syllabus (authored)"]
    TINTEL["data/topic-intel (curated exam intel)"]
    STAGES["lib/stages (TopicState, lifecycle, scope)"]

    UI --> AS
    UI --> KS
    UI --> Engine
    UI --> KEngine
    AS --> Engine
    AS -. read-only:\nbackup + focus collection .-> KS
    Engine --> SYLL
    Engine --> STAGES
    INTEL --> TINTEL
    PRIO --> CONF
    PRIO --> INTEL
    WORK --> PRIO
    SCHED --> WORK
    SCHED --> CAP
    FC --> WORK
    FC --> CAP
    REC --> FC
    REC --> AN
    HEALTH --> FC
    HEALTH --> AN
    EXPL --> PRIO
    KEngine --> SYLL
    KS --> KEngine
```

Dependency direction is strict: components → stores → services → data.
Services never import stores. knowledge-store never imports app-store.

## 2. Route & component map

```mermaid
flowchart LR
    subgraph Routes
        R1["/ (landing, server)"]
        R2["(app)/layout — shell:\nSidebar · MobileNav · MobileHeader · SearchProvider"]
        R3["dashboard/page"]
        R4["planner/page → PlannerView"]
        R5["syllabus/page"]
        R6["syllabus/[id]/page (SSG × 296)"]
        R7["settings/page"]
    end

    R3 --> D1[Greeting]
    R3 --> D2[CountdownCard]
    R3 --> D3[OverallProgressCard]
    R3 --> D4[TodayPlanCard]
    R3 --> D5[InsightsCard]
    R3 --> D6[PapersCard]
    R3 --> D7[RecentActivityCard]
    R3 --> D8[KnowledgeCard]
    R3 --> D9[RecentTopicsCard]

    R4 --> P1[SetupWizard / SetupForm]
    R4 --> P2[TodayView → TaskCard]
    R4 --> P3[WeekView → TaskCard compact + DnD]
    R4 --> P4[ScopeView]
    R4 --> P5[AnalyticsView]
    R4 --> P6[PlannerSettingsDialog]

    R6 --> S1[StatusSelect]
    R6 --> S2[TopicMeta]
    R6 --> S3[BookmarkMenu]
    R6 --> S4[PlanTopicMenu]
    R6 --> S5["TopicWorkspace → 9 KnowledgeSections"]
    R6 --> S6[TopicList / SubtreeProgress / RecentTracker]
```

## 3. The scheduling pipeline (one replan)

```mermaid
sequenceDiagram
    participant UI as PlannerView / actions
    participant Store as app-store.regenerate
    participant An as analytics.fatigueIndicator
    participant KS as knowledge-store (read)
    participant Sch as scheduler.generateSchedule
    participant Wk as workload
    participant Pr as priority/confidence/intel

    UI->>Store: regeneratePlan()
    Store->>Store: overdue pending → "missed" (+ behaviour counters)
    Store->>Store: drop pending auto tasks; keep pinned (scope-aware)
    Store->>An: fatigue from REAL history (never planned load)
    An-->>Store: loadFactor (burnoutSensitivity damping)
    Store->>KS: focusCollectionId → topic id set (fresh study only)
    Store->>Sch: settings, topics, pinned, usedToday, loadFactor, filter
    Sch->>Wk: buildRevisionQueue (included topics, due ≤ horizon)
    Sch->>Wk: buildWorkPool (included ∩ filter, minus pinned minutes)
    Wk->>Pr: priorityScore per topic (with reasons)
    loop each day in 14-day horizon
        Sch->>Sch: skip recovery/vacation; capacity × factors
        Sch->>Sch: 1) due revisions (≤60% cap) 2) continuity 3) rotation fill\n(hard spacing, maxHard/day, pick sweep ≤40)
    end
    Sch-->>Store: auto PlannedTasks
    Store->>Store: write daily snapshot (burnout, health, remaining, backlog)
    Store-->>UI: new state → all widgets re-derive
```

## 4. Data flow for derived intelligence

```mermaid
flowchart LR
    T[topics: TopicState] --> W[workload]
    K[tasks: PlannedTask history] --> A[analytics]
    T --> F[forecast]
    K --> F
    S[settings] --> F
    S --> C2[capacity]
    T --> B[burnout / fatigue]
    K --> B
    F --> R[recommendations]
    B --> R
    A --> R
    T --> H[health]
    K --> H
    F --> H
    B --> H
    K --> TL[knowledge timeline merge]
    EV[knowledge events] --> TL
    R --> IC[InsightsCard]
    H --> IC
    F --> AV[AnalyticsView]
    B --> AV
    H --> AV
    SNAP[daily snapshots] --> AV
```

Nothing in this graph is stored except the inputs (topics, tasks, events,
settings) and the daily snapshot; every arrow is a pure function evaluated in
`useMemo` on render.

## 5. Search architecture

```mermaid
flowchart LR
    Q[query] --> FZ["fuzzyScore\nsubstring 3 > tokens 2 > subsequence 1"]
    subgraph Sources
        TP[syllabus leaves]
        RN[rich notes]
        QN[quick notes]
        KW[keywords]
        FC2[flashcards]
        PQ[pyqs]
        RS[resources]
        CA[current affairs]
        BK[book refs]
    end
    Sources --> FZ
    FZ --> HITS["ranked hits (type, title, subtitle, topicId)"]
    HITS --> PAL["Ctrl+K palette\nfilter chips per type\n→ navigate /syllabus/topicId"]
```

## 6. Backup & persistence

```mermaid
flowchart LR
    AS[app-store v4] -->|exportStateToJSON| FILE["backup JSON\nBACKUP_VERSION 5"]
    KS[knowledge-store v1] -->|exportKnowledge| FILE
    FILE -->|parseExportedState\nsanitize everything, accept v1–v5| IMP[import]
    IMP --> AS
    IMP --> KS
    AS -->|persist.migrate v1→v2→v3→v4| LS[(localStorage)]
    KS --> LS
```

## 7. Subsystem inventory (file ↔ responsibility)

| Subsystem | Files | Responsibility |
|---|---|---|
| Syllabus | `data/syllabus/*`, `lib/syllabus.ts` | Authored tree → indexed API (ids, breadcrumbs, leaf counts) built once at module load |
| Lifecycle | `lib/stages.ts` | StudyStage ladder + weights, TopicState (+plan scope), priorities meta, cached default-merge |
| Progress | `lib/progress.ts` | Weighted roll-ups per subtree |
| Exam intel | `data/topic-intel.ts`, `lib/planner/intel.ts` | Curated priorities/difficulty/time; cascading resolution user→topic→ancestors→config |
| Capacity | `lib/planner/capacity.ts` | Day/weekly minutes, sessions, slots, vacations, weekend & aggressiveness factors |
| Workload | `lib/planner/workload.ts` | Estimates, remaining minutes, revision minutes, pools & queues (scope-aware) |
| Priority | `lib/planner/priority.ts` + `confidence.ts` | Dynamic score with reasons; effective-confidence decay model |
| Scheduler | `lib/planner/scheduler.ts` | The day-fill pipeline (revisions → continuity → rotation) |
| Forecast | `lib/planner/forecast.ts` | Workload vs capacity vs observed pace; probabilities; CI |
| Analytics | `lib/planner/analytics.ts` | Streaks, completion %, distributions, burnout + fatigue indicators |
| Recommendations | `lib/planner/recommendations.ts` | Rule set with mandatory WHY |
| Health | `lib/planner/health.ts` | 7-component weighted score |
| Explain | `lib/planner/explain.ts` | Per-task reasons + mission reasoning (reconstructed, not stored) |
| Knowledge | `lib/knowledge/*`, `store/knowledge-store.ts` | Entities, CRUD, review logic, timeline, sanitization, search, insights |
| Stores | `store/app-store.ts`, `store/knowledge-store.ts` | Persistence, actions, migrations, backup |
| Shell/UI | `components/**` | Presentation only; business logic lives in lib/ |

## 8. Rendering & performance model

- All 303 pages are statically generated (SSG); interactivity is client-side.
- Client components reading persisted state gate on `useMounted()` to avoid
  hydration mismatches (SSR renders defaults).
- Expensive derivations (`forecast`, `health`, `recommendations`, search hits,
  scope counts) are wrapped in `useMemo` keyed on store slices; store slices
  are stable references (immutable updates + `getTopicState` WeakMap cache).
- The scheduler runs only on explicit replan triggers, never per-render.
- Timeline events capped (1500) and snapshots pruned (60 days) to bound
  localStorage growth; a usage meter lives in Settings.
