import { KNOWLEDGE_CONFIG } from "./config";

/** Word count of a markdown document (whitespace-delimited). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}

/** Estimated reading time in whole minutes (minimum 1 for any content). */
export function readingMinutes(words: number): number {
  if (words === 0) return 0;
  return Math.max(
    1,
    Math.round(words / KNOWLEDGE_CONFIG.readingWordsPerMinute),
  );
}

export type MarkdownSnippetKind =
  | "heading"
  | "bold"
  | "italic"
  | "list"
  | "checklist"
  | "quote"
  | "callout"
  | "code"
  | "table"
  | "link"
  | "image";

export type SnippetResult = {
  text: string;
  /** Where to place the caret after insertion. */
  selectionStart: number;
  selectionEnd: number;
};

/**
 * Apply a markdown snippet to `text` at the current selection. Inline kinds
 * wrap the selection; block kinds insert at a fresh line. Pure — the editor
 * component owns the DOM.
 */
export function applySnippet(
  text: string,
  start: number,
  end: number,
  kind: MarkdownSnippetKind,
): SnippetResult {
  const selected = text.slice(start, end);
  const before = text.slice(0, start);
  const after = text.slice(end);

  const wrap = (prefix: string, suffix: string, placeholder: string) => {
    const body = selected || placeholder;
    const next = `${before}${prefix}${body}${suffix}${after}`;
    return {
      text: next,
      selectionStart: start + prefix.length,
      selectionEnd: start + prefix.length + body.length,
    };
  };

  const block = (snippet: string, caretOffset: number, caretLength = 0) => {
    const needsNewline = before !== "" && !before.endsWith("\n");
    const prefix = needsNewline ? "\n" : "";
    const next = `${before}${prefix}${snippet}${after}`;
    const base = start + prefix.length + caretOffset;
    return { text: next, selectionStart: base, selectionEnd: base + caretLength };
  };

  switch (kind) {
    case "bold":
      return wrap("**", "**", "bold text");
    case "italic":
      return wrap("*", "*", "italic text");
    case "link":
      return wrap("[", "](https://)", "link text");
    case "image":
      return wrap("![", "](https://)", "alt text");
    case "heading":
      return block("## Heading\n", 3, "Heading".length);
    case "list":
      return block("- item\n", 2, "item".length);
    case "checklist":
      return block("- [ ] task\n", 6, "task".length);
    case "quote":
      return block("> quote\n", 2, "quote".length);
    case "callout":
      return block("> [!note] Title\n> body\n", 10, "Title".length);
    case "code":
      return block("```\ncode\n```\n", 4, "code".length);
    case "table":
      return block(
        "| Column | Column |\n| --- | --- |\n| cell | cell |\n",
        2,
        "Column".length,
      );
  }
}
