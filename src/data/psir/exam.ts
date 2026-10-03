/**
 * PSIR exam pattern, answer formats and strategy — the practical "how to
 * score" layer of the optional. Numbers are planning guidance; the
 * question paper's printed word limits always win.
 */

export const PSIR_PAPERS = [
  {
    id: "mains.psir1",
    short: "Paper I",
    title: "Political Theory & Indian Politics",
    sections: [
      { label: "Section A", title: "Political Theory & Thought" },
      { label: "Section B", title: "Indian Government & Politics" },
    ],
  },
  {
    id: "mains.psir2",
    short: "Paper II",
    title: "Comparative Politics & International Relations",
    sections: [
      { label: "Section A", title: "Comparative Analysis & International Politics" },
      { label: "Section B", title: "India & the World" },
    ],
  },
] as const;

/** Units belonging to Section A of each paper (the rest are Section B). */
export const PSIR_SECTION_A_UNITS = new Set([
  "mains.psir1.theory",
  "mains.psir1.concepts",
  "mains.psir1.ideologies",
  "mains.psir1.indian-thought",
  "mains.psir1.western-thought",
  "mains.psir2.comparative",
  "mains.psir2.ir-theory",
  "mains.psir2.world-order",
  "mains.psir2.economic-system",
  "mains.psir2.un",
  "mains.psir2.regionalisation",
  "mains.psir2.global-concerns",
]);

export const PSIR_PATTERN = {
  marksPerPaper: 250,
  totalMarks: 500,
  minutesPerPaper: 180,
  facts: [
    { label: "Weight", value: "500 marks", detail: "2 papers × 250 — over a quarter (28.6%) of the 1,750-mark written total." },
    { label: "Duration", value: "3 hours", detail: "per paper; both papers are written on the same day." },
    { label: "Questions", value: "Attempt 5 of 8", detail: "Q1 and Q5 compulsory + at least one more from each section." },
    { label: "Compulsory", value: "Q1 & Q5", detail: "five 10-mark parts each — 10 short answers of ~150 words." },
  ],
};

export type AnswerFormat = {
  marks: 10 | 15 | 20;
  words: number;
  minutes: number;
  shape: string;
};

/** 180 minutes ÷ 250 marks ≈ 0.72 min per mark. */
export const ANSWER_FORMATS: AnswerFormat[] = [
  {
    marks: 10,
    words: 150,
    minutes: 7,
    shape: "2-line intro · 3–4 crisp points · 1-line conclusion",
  },
  {
    marks: 15,
    words: 250,
    minutes: 11,
    shape: "Intro · 2 dimensions with sub-points · example · conclusion",
  },
  {
    marks: 20,
    words: 300,
    minutes: 14,
    shape: "Intro · 3 dimensions · competing perspectives · examples · way forward",
  },
];

export function answerFormat(marks: number): AnswerFormat {
  return (
    ANSWER_FORMATS.find((format) => format.marks === marks) ?? ANSWER_FORMATS[0]
  );
}

/** The skeleton of a high-scoring PSIR answer. */
export const ANSWER_FRAMEWORK = [
  {
    step: "Decode",
    detail:
      "Underline the directive (discuss / critically examine / comment) and every part of the demand. Answer exactly that.",
  },
  {
    step: "Introduce",
    detail:
      "Open with a definition, a thinker's line or a sharp contemporary hook — never a generic sentence.",
  },
  {
    step: "Theorise",
    detail:
      "Bring 2–3 thinkers or schools (Liberal, Marxist, Feminist, Gandhian, Post-colonial). Theory is what separates PSIR from GS.",
  },
  {
    step: "Contrast",
    detail:
      "Show the debate: for vs against, envisaged vs actual working, West vs India, theory vs practice.",
  },
  {
    step: "Evidence",
    detail:
      "Anchor with a judgment, an article, data, a committee or a current event (Paper II Section B lives on these).",
  },
  {
    step: "Conclude",
    detail:
      "Balanced, forward-looking, ideally echoing the introduction or a thinker. One or two lines.",
  },
];

/** Concrete, PSIR-specific strategy — what actually moves the score. */
export const PSIR_STRATEGY = [
  {
    title: "Read the PYQs before the chapter",
    detail:
      "Ten years of PSIR questions show the angles UPSC repeats (Rawls vs communitarians, Gramsci's hegemony, envisaged vs actual role, India–China). Read them first so your notes are question-shaped.",
  },
  {
    title: "Build one-page thinker sheets",
    detail:
      "For each thinker: works, 4 core ideas, 2 quotes, 2 critiques, where to use them. The Thinkers vault gives you the starting draft.",
  },
  {
    title: "Interlink the two papers",
    detail:
      "Paper I theory powers Paper II answers (realism ↔ Hobbes, liberal internationalism ↔ Kant & Locke, dependency ↔ Marx). Linking theory to India's practice is the topper's signature.",
  },
  {
    title: "Treat Section B of Paper II as current affairs",
    detail:
      "Keep a running timeline per relationship (China, USA, Russia, neighbours, West Asia). Link every relevant news item to its topic from the topic page's Current Affairs section.",
  },
  {
    title: "Write every week, time every answer",
    detail:
      "Two timed answers a day beat reading a third book. Use Answer Practice: the timer and word target mirror exam conditions.",
  },
  {
    title: "Use diagrams where they save words",
    detail:
      "Easton's systems model, Gramsci's state = political society + civil society, India's concentric circles of foreign policy, Almond's political-culture types — a 10-second diagram can replace 60 words.",
  },
  {
    title: "Harvest GS overlap deliberately",
    detail:
      "PSIR covers large parts of GS-II (polity, IR), GS-IV (thinkers) and the Essay. Study once, tag twice — see the synergy map.",
  },
];
