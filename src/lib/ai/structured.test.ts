import { describe, expect, it } from "vitest";

import { parseFlashcardDrafts, parseJsonLoose, parseQuiz } from "./structured";

describe("parseJsonLoose", () => {
  it("parses fenced and bare JSON", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('prefix {"a":1} suffix')).toEqual({ a: 1 });
    expect(parseJsonLoose("not json at all")).toBeNull();
  });
});

describe("parseFlashcardDrafts", () => {
  it("keeps valid cards and drops malformed ones", () => {
    const text = JSON.stringify({
      cards: [
        { front: "What is Article 14?", back: "Equality before law" },
        { front: "", back: "empty front" },
        { back: "no front" },
        { front: "Valid", back: "Card" },
      ],
    });
    const drafts = parseFlashcardDrafts(text, []);
    expect(drafts).toHaveLength(2);
    expect(drafts[0].front).toBe("What is Article 14?");
  });

  it("dedupes against existing fronts and within the batch", () => {
    const text = JSON.stringify({
      cards: [
        { front: "Article 14", back: "x" },
        { front: "article  14", back: "y" }, // normalized duplicate
        { front: "New one", back: "z" },
      ],
    });
    const drafts = parseFlashcardDrafts(text, ["Article 14!"]);
    expect(drafts.map((d) => d.front)).toEqual(["New one"]);
  });

  it("accepts a bare array too", () => {
    const drafts = parseFlashcardDrafts('[{"front":"Q","back":"A"}]', []);
    expect(drafts).toHaveLength(1);
  });
});

describe("parseQuiz", () => {
  it("validates the MCQ schema strictly", () => {
    const text = JSON.stringify({
      questions: [
        {
          question: "Q1?",
          options: ["a", "b", "c", "d"],
          answerIndex: 2,
          explanation: "because",
        },
        { question: "bad", options: ["only", "three", "opts"], answerIndex: 0 },
        { question: "bad idx", options: ["a", "b", "c", "d"], answerIndex: 7 },
      ],
    });
    const quiz = parseQuiz(text);
    expect(quiz).toHaveLength(1);
    expect(quiz[0].answerIndex).toBe(2);
    expect(quiz[0].options).toHaveLength(4);
  });

  it("returns [] when nothing usable is present", () => {
    expect(parseQuiz("garbage")).toEqual([]);
  });
});
