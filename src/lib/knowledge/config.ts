/** Knowledge OS storage policy — tunables live here, never inline. */
export const KNOWLEDGE_CONFIG = {
  /** Minutes between auto-save snapshots recorded as note "versions". */
  noteVersionGapMinutes: 10,
  /** Version timestamps kept per note. */
  noteVersionCap: 20,
  /** Timeline events kept overall (oldest pruned first). */
  timelineEventCap: 1500,
  /** A flashcard counts as "due" after this many days unreviewed. */
  flashcardDueAfterDays: 7,
  /** Words per minute used for note reading-time estimates. */
  readingWordsPerMinute: 200,
} as const;
