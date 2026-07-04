import type { Difficulty, Priority } from "@/lib/stages";

/**
 * Curated exam intelligence for the syllabus.
 *
 * Hints cascade: topic override → unit default → paper default → global
 * config defaults (see src/lib/planner/intel.ts). A user's own setting on a
 * topic always beats everything here.
 *
 * Priorities reflect UPSC asking patterns and foundational importance:
 * repeatedly-asked and concept-foundational topics are Critical/High;
 * peripheral or qualifying material is Medium/Low. `estimatedMinutes` is the
 * base first-reading time (difficulty multiplies it); `revisionWeight` is
 * the share of that time one spaced revision takes.
 */
export type IntelHint = {
  priority?: Priority;
  difficulty?: Difficulty;
  estimatedMinutes?: number;
  revisionWeight?: number;
};

/** Defaults by paper id or unit id (any ancestor prefix of a topic id). */
export const unitIntelDefaults: Record<string, IntelHint> = {
  /* ---------------- Prelims — General Studies ---------------- */
  "prelims.gs": { revisionWeight: 0.3 },
  "prelims.gs.history.ancient": { priority: "medium" },
  "prelims.gs.history.medieval": { priority: "medium" },
  "prelims.gs.history.modern": { priority: "high" },
  "prelims.gs.history.culture": { priority: "high", revisionWeight: 0.4 },
  "prelims.gs.geography.physical": { priority: "high", difficulty: "hard" },
  "prelims.gs.geography.india": { priority: "high" },
  "prelims.gs.geography.world": { priority: "medium" },
  "prelims.gs.polity": { priority: "high" },
  "prelims.gs.economy.basics": { priority: "high", difficulty: "hard" },
  "prelims.gs.economy.development": { priority: "medium" },
  "prelims.gs.economy.sectors": { priority: "medium" },
  "prelims.gs.economy.schemes": { priority: "high", revisionWeight: 0.4 },
  "prelims.gs.environment": { priority: "high", revisionWeight: 0.4 },
  "prelims.gs.science": { priority: "medium" },
  "prelims.gs.current-affairs": { priority: "high", revisionWeight: 0.5 },

  /* ---------------- Prelims — CSAT (qualifying) ---------------- */
  "prelims.csat": {
    priority: "medium",
    difficulty: "easy",
    estimatedMinutes: 60,
    revisionWeight: 0.15,
  },

  /* ---------------- Mains ---------------- */
  "mains.essay": { priority: "medium", estimatedMinutes: 60, revisionWeight: 0.2 },
  "mains.gs1.culture": { priority: "high" },
  "mains.gs1.modern-history": { priority: "high" },
  "mains.gs1.freedom-struggle": { priority: "high" },
  "mains.gs1.post-independence": { priority: "medium" },
  "mains.gs1.world-history": { priority: "medium" },
  "mains.gs1.society": { priority: "high" },
  "mains.gs1.geography": { priority: "high" },
  "mains.gs2.constitution": { priority: "critical", difficulty: "hard" },
  "mains.gs2.polity": { priority: "high" },
  "mains.gs2.governance": { priority: "high" },
  "mains.gs2.social-justice": { priority: "medium" },
  "mains.gs2.ir": { priority: "high" },
  "mains.gs3.economy": { priority: "high", difficulty: "hard" },
  "mains.gs3.agriculture": { priority: "high" },
  "mains.gs3.science-tech": { priority: "medium" },
  "mains.gs3.environment": { priority: "high" },
  "mains.gs3.security": { priority: "medium" },
  "mains.gs4": { priority: "high", revisionWeight: 0.35 },
  "mains.languages": {
    priority: "low",
    difficulty: "easy",
    estimatedMinutes: 45,
    revisionWeight: 0.1,
  },
};

/** Topic-level overrides (full topic ids). */
export const topicIntelOverrides: Record<string, IntelHint> = {
  /* ---- Prelims Polity: the foundational core ---- */
  "prelims.gs.polity.constitution.fundamental-rights": {
    priority: "critical",
    difficulty: "hard",
    estimatedMinutes: 150,
  },
  "prelims.gs.polity.constitution.amendment": {
    priority: "critical",
    difficulty: "hard",
    estimatedMinutes: 120,
  },
  "prelims.gs.polity.constitution.features-preamble": { priority: "high" },
  "prelims.gs.polity.constitution.dpsp": { priority: "high" },
  "prelims.gs.polity.constitution.citizenship": { priority: "medium" },
  "prelims.gs.polity.union-state.parliament": {
    priority: "critical",
    difficulty: "hard",
    estimatedMinutes: 150,
  },
  "prelims.gs.polity.union-state.judiciary": {
    priority: "critical",
    estimatedMinutes: 120,
  },
  "prelims.gs.polity.union-state.president": { priority: "high" },
  "prelims.gs.polity.federalism-local.centre-state": { priority: "high" },
  "prelims.gs.polity.federalism-local.panchayati-raj": { priority: "high" },
  "prelims.gs.polity.federalism-local.ut-special": { priority: "medium" },
  "prelims.gs.polity.bodies.election-commission": { priority: "high" },
  "prelims.gs.polity.bodies.constitutional-bodies": { priority: "high" },
  "prelims.gs.polity.governance.acts-policies": { priority: "medium" },

  /* ---- Prelims Economy ---- */
  "prelims.gs.economy.basics.money-banking": {
    priority: "critical",
    estimatedMinutes: 150,
  },
  "prelims.gs.economy.basics.fiscal-policy": {
    priority: "critical",
    estimatedMinutes: 120,
  },
  "prelims.gs.economy.basics.inflation": { priority: "high" },
  "prelims.gs.economy.basics.external-sector": { priority: "high" },
  "prelims.gs.economy.basics.national-income": { priority: "high" },

  /* ---- Prelims Environment: highest recent weightage ---- */
  "prelims.gs.environment.biodiversity": {
    priority: "critical",
    estimatedMinutes: 120,
  },
  "prelims.gs.environment.climate-change": {
    priority: "critical",
    estimatedMinutes: 120,
  },
  "prelims.gs.environment.conventions": {
    priority: "high",
    revisionWeight: 0.5,
  },
  "prelims.gs.environment.ecology-basics": { priority: "high" },

  /* ---- Prelims Geography ---- */
  "prelims.gs.geography.india.climate": {
    priority: "critical",
    difficulty: "hard",
    estimatedMinutes: 120,
  },
  "prelims.gs.geography.india.physiography": { priority: "high" },
  "prelims.gs.geography.india.drainage": { priority: "high" },
  "prelims.gs.geography.physical.climatology": { estimatedMinutes: 120 },

  /* ---- Prelims History ---- */
  "prelims.gs.history.modern.gandhian-era": {
    priority: "critical",
    estimatedMinutes: 150,
  },
  "prelims.gs.history.modern.constitutional-devs": { priority: "high" },
  "prelims.gs.history.modern.socio-religious-reform": { priority: "high" },
  "prelims.gs.history.medieval.mughals": { estimatedMinutes: 150 },
  "prelims.gs.history.medieval.delhi-sultanate": { estimatedMinutes: 120 },
  "prelims.gs.history.ancient.religious-movements": { priority: "high" },
  "prelims.gs.history.culture.architecture": { estimatedMinutes: 120 },

  /* ---- Prelims Science ---- */
  "prelims.gs.science.space": { priority: "high" },
  "prelims.gs.science.it-emerging": { priority: "high" },

  /* ---- CSAT ---- */
  "prelims.csat.comprehension": { priority: "high", estimatedMinutes: 90 },
  "prelims.csat.numeracy": { difficulty: "medium", estimatedMinutes: 90 },
  "prelims.csat.data-interpretation": { difficulty: "medium" },

  /* ---- Essay ---- */
  "mains.essay.craft": { priority: "high", estimatedMinutes: 120 },

  /* ---- Mains GS1 ---- */
  "mains.gs1.geography.geophysical-phenomena": { priority: "critical" },
  "mains.gs1.society.women": { priority: "high" },
  "mains.gs1.society.communalism": { priority: "high" },
  "mains.gs1.freedom-struggle.stages": { estimatedMinutes: 120 },

  /* ---- Mains GS2 ---- */
  "mains.gs2.constitution.evolution": {
    priority: "critical",
    estimatedMinutes: 150,
  },
  "mains.gs2.polity.parliament-legislatures": { priority: "critical" },
  "mains.gs2.ir.neighborhood": { priority: "critical" },
  "mains.gs2.governance.policies": { priority: "high" },
  "mains.gs2.social-justice.welfare-schemes": { priority: "high" },

  /* ---- Mains GS3 ---- */
  "mains.gs3.economy.planning-growth": {
    priority: "critical",
    estimatedMinutes: 150,
  },
  "mains.gs3.agriculture.subsidies-msp": { priority: "critical" },
  "mains.gs3.environment.conservation": { priority: "critical" },
  "mains.gs3.economy.budgeting": { priority: "high" },
  "mains.gs3.agriculture.pds-food-security": { priority: "high" },
  "mains.gs3.security.cyber-media": { priority: "high" },

  /* ---- Mains GS4 ---- */
  "mains.gs4.case-studies.practice": {
    priority: "critical",
    difficulty: "hard",
    estimatedMinutes: 180,
  },
  "mains.gs4.probity.corruption": { priority: "critical" },
  "mains.gs4.ethics-interface.essence": { priority: "high" },
  "mains.gs4.emotional-intelligence.concepts": { priority: "high" },
  "mains.gs4.thinkers.indian": { priority: "high" },
  "mains.gs4.attitude.persuasion": { priority: "medium" },
};
