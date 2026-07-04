import type { SyllabusNodeDef } from "./types";

export const mainsEssay: SyllabusNodeDef = {
  id: "essay",
  title: "Essay",
  description:
    "250 marks · Two essays from a choice of topics. Tests coherent arrangement of ideas, effective expression and exam-relevant thinking.",
  children: [
    { id: "philosophical", title: "Philosophical & abstract topics" },
    { id: "social", title: "Social & cultural themes" },
    { id: "polity-governance", title: "Polity, governance & democracy themes" },
    { id: "economy-development", title: "Economy & development themes" },
    { id: "science-tech", title: "Science, technology & environment themes" },
    { id: "international", title: "International & security themes" },
    { id: "craft", title: "Essay craft (structure, introductions, transitions, conclusions)" },
  ],
};

export const mainsLanguages: SyllabusNodeDef = {
  id: "languages",
  title: "Qualifying Papers — Language",
  description:
    "Paper A (Indian language) & Paper B (English) · 300 marks each · qualifying at 25%. Marks not counted for ranking.",
  children: [
    {
      id: "paper-a",
      title: "Paper A — Indian Language",
      children: [
        { id: "comprehension", title: "Comprehension of given passages" },
        { id: "precis", title: "Précis writing" },
        { id: "usage-vocabulary", title: "Usage & vocabulary" },
        { id: "essay-short", title: "Short essays" },
        { id: "translation", title: "Translation (English ↔ Indian language)" },
      ],
    },
    {
      id: "paper-b",
      title: "Paper B — English",
      children: [
        { id: "comprehension", title: "Comprehension of given passages" },
        { id: "precis", title: "Précis writing" },
        { id: "usage-vocabulary", title: "Usage & vocabulary" },
        { id: "essay-short", title: "Short essays" },
      ],
    },
  ],
};
