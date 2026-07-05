# PHASE_C_SPEC.md — The AI Phase (blueprint only, nothing implemented)

> Every feature below builds on `docs/API_ABSTRACTION.md` and writes only into
> the AI placeholders already present in the data model. Ordered roughly by
> value ÷ effort. Common rules: graceful no-AI degradation, cached by content
> hash + prompt version, explainable ("generated from your notes on …"),
> and NEVER mutating primary user data (AI output is always additive and
> user-deletable).

Legend per feature: **P** purpose · **I** inputs · **O** outputs · **D** data/
services · **S** screens · **A** approach · **F** future.

## 1. AI Topic Summaries
**P** Exam-oriented summary of a topic from the user's own material.
**I** topicId; ContextBundle (rich note, quick notes, keywords, PYQs).
**O** markdown summary → `RichNote.ai.summary`.
**D** ContextBuilder, notes service, syllabus. **S** topic workspace (AI card).
**A** single completion, ~500-token budget, "Regenerate" invalidates cache.
**F** compare-with-syllabus gaps; export summaries as revision sheets.

## 2. AI Quiz Generation
**P** Self-test MCQs/short answers from a topic's knowledge.
**I** topicId, count, difficulty; note+keywords+PYQ context.
**O** JSON quiz (schema-validated) → `RichNote.ai.quiz`; interactive dialog.
**D** ContextBuilder (json mode). **S** topic workspace; dashboard "quiz me".
**A** structured output with strict zod-style validation + one repair retry.
**F** wrong answers auto-create flashcards; UPSC-pattern negative marking.

## 3. AI Flashcard Generation
**P** Draft cards from notes in one click.
**I** topicId, note markdown, existing cards (dedupe).
**O** proposed `Flashcard[]` — user reviews/edits before save (never auto-save).
**D** knowledge-store addFlashcard, notes service. **S** flashcards section.
**A** json mode; dedupe by fuzzy front-match against existing cards.
**F** cloze deletion cards; difficulty estimation per card.

## 4. AI Revision Assistant
**P** Turn a due revision session into an active-recall dialogue.
**I** topicId, revision round, effective confidence, note/keywords.
**O** question→answer→feedback loop (streamed); optional confidence suggestion.
**D** confidence engine, revision ladder, ContextBuilder, conversation memory.
**S** task card ("Revise with AI"), Today view.
**A** short conversation (≤6 turns) seeded with the topic bundle.
**F** difficulty adapts to streaks; spaced-quality grading feeding a real SRS.

## 5. AI Study Planner (natural-language planning)
**P** "I have 3 free hours Saturday, want Polity" → pinned sessions.
**I** utterance + forecast + capacity + scope.
**O** proposed `PlannedTask[]` (user confirms) via existing `planTopicNow`/moveTask.
**D** scheduler, capacity, workload; json mode. **S** planner header.
**A** LLM proposes; DETERMINISTIC engine validates/clamps (capacity, scope) —
the LLM never writes tasks directly.
**F** recurring intents ("keep Sundays revision-only").

## 6. AI Replanning Advisor
**P** Explain and improve a bad week ("what should I postpone?").
**I** missed tasks, backlog, forecast, burnout, scope.
**O** ranked suggestions mapped to REAL actions (pause unit X, weekend
revision mode, +30 min/day) with one-click apply via existing store actions.
**D** recommendations engine (AI narrates/extends it, never replaces it).
**S** Insights card, planner banner.
**A** feed engine outputs as context; require action-schema outputs.
**F** weekly "replan review" ritual.

## 7. AI Daily Mentor
**P** One paragraph each morning: today's mission, why it matters, one nudge.
**I** today's tasks + reasons (explain engine), streak, health, forecast.
**O** mentor note on dashboard (cached per day).
**D** explain, health, forecast, analytics. **S** dashboard.
**A** temperature ~0.7, strict 120-word cap, tone guide in prompt.
**F** evening reflection; weekly narrative.

## 8. AI Current Affairs Explainer
**P** "Why does this news matter for GS-II?" + syllabus mapping.
**I** CurrentAffair entry (title/summary/source), candidate topics.
**O** exam-relevance note → `CurrentAffair.aiSummary`; suggested extra topicIds.
**D** knowledge search (candidate topics), syllabus. **S** CA section.
**A** completion + topic-id validation against the real tree.
**F** batch digest mode when a feeds phase exists.

## 9. AI PYQ Analysis
**P** Model answers, marking hints, trend insight per question.
**I** Pyq (question/year/paper/marks), topic bundle.
**O** explanation → `Pyq.aiExplanation`; optional "expected answer" draft.
**D** pyq entities, ContextBuilder. **S** PYQ section (expanded row).
**A** per-question completion; topic-level trend summary once ≥N questions.
**F** weightage analytics narrative (pairs with the PYQ Intelligence phase).

## 10. AI Weakness Detection
**P** Name the weak areas and say why.
**I** effective confidence per topic, postpone/miss counters, quiz/review
results, PYQ solve rates.
**O** ranked weak topics with reasons + one-click "add to Weak Areas
collection" (existing bookmarks) and "focus planner" (existing focus).
**D** confidence, behaviour history, insights, collections, scope.
**S** Insights card, Analytics.
**A** mostly deterministic scoring; LLM writes the narrative layer only.
**F** feeds AI Study Planner weighting.

## 11. AI Answer Evaluation (Mains)
**P** Score a written answer against UPSC rubric.
**I** question (often a Pyq), user's answer text, marks, GS paper.
**O** band score + rubric feedback (structure/content/examples/conclusion);
stored beside the Pyq note.
**D** pyq entities; json rubric schema. **S** PYQ section → evaluation dialog.
**A** rubric-locked prompt; consistency tests (same answer → stable band).
**F** photo upload + OCR (needs Bridge/back-end phase); progress-over-time.

## 12. AI Essay Feedback
**P** Outline critique and full-essay review for the Essay paper.
**I** essay text/outline, topic theme.
**O** structured feedback + band; brainstorming mode (streamed).
**D** essay topics exist under `mains.essay`. **S** new Essay area of the
essay topic pages (still inside existing topic-page pattern).
**A** long-context completion; chunk if needed.
**F** thesis bank connected to keywords/quotes.

## 13. AI Interview Mode
**P** Mock personality-test interview (DAF-style, text first).
**I** user profile notes (Interview Notes collection), current affairs, weak topics.
**O** streamed multi-turn interview with follow-ups + end review.
**D** conversation memory, bookmarks, CA entities. **S** dedicated dialog
launched from the Interview Notes collection.
**A** persona prompt + memory summarization; strictly text (voice = future).
**F** voice mode; panel simulation.

## 14. AI Search (answer-style)
**P** Ask questions across your whole knowledge base, get a cited answer.
**I** query; top fuzzy hits (existing search) as retrieval set.
**O** synthesized answer with links to source topics/notes.
**D** knowledge search (already ranks), ContextBuilder. **S** Ctrl+K palette
("Ask AI" row when query looks like a question).
**A** local lexical retrieval → LLM synthesis (RAG without embeddings first);
embeddings-based recall is a later upgrade (needs storage evolution).
**F** pgvector/IndexedDB embeddings in the Bridge phase.

## 15. AI Knowledge Assistant (topic chat)
**P** Free chat grounded in ONE topic's workspace ("explain 358 vs 359").
**I** conversation + topic ContextBundle.
**O** streamed chat; "save as quick note/flashcard" buttons on any reply.
**D** conversation memory, all knowledge services. **S** topic workspace AI
section (replaces today's disabled card).
**A** the reference implementation for conversation memory + streaming; build
FIRST as the pattern-setter.
**F** cross-topic chat once AI Search matures.

## Suggested build order
15 → 1 → 3 → 7 → 2 → 8 → 10 → 4 → 6 → 9 → 5 → 11 → 12 → 14 → 13
(pattern-setter first, then cheap high-value generation, then advisory, then
evaluation-grade features that need rubric hardening.)
