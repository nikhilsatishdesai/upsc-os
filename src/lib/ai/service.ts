import { AI_CONFIG } from "./config";
import { createAiClient, type AiClient } from "./client";
import {
  buildStudyContext,
  buildTopicContext,
  type KnowledgeSnapshot,
  type StudySnapshot,
} from "./context";
import {
  buildAnalyticsExplanationPrompt,
  buildConversationSummaryPrompt,
  buildCurrentAffairsPrompt,
  buildDailyBriefingPrompt,
  buildExplainTopicPrompt,
  buildFlashcardsPrompt,
  buildImproveNotesPrompt,
  buildMentorChatPrompt,
  buildMnemonicsPrompt,
  buildPlannerAdvicePrompt,
  buildPyqAnalysisPrompt,
  buildQuizPrompt,
  buildRevisionCoachPrompt,
  buildSimplifyNotesPrompt,
  buildTopicSummaryPrompt,
  type AnalyticsSubject,
  type BuiltPrompt,
  type QuizDifficulty,
} from "./prompts";
import {
  conversationWindow,
  needsSummary,
  overflowMessages,
  renderMemory,
  type AiConversation,
  type MentorMemory,
} from "./memory";
import {
  parseFlashcardDrafts,
  parseQuiz,
  type FlashcardDraft,
  type QuizQuestion,
} from "./structured";
import { getNode } from "@/lib/syllabus";
import { todayStr } from "@/lib/planner/dates";
import type { AiAction, AiActionGateway } from "./actions";
import { describeAiAction, executeAiAction } from "./actions";
import type { AiCacheEntry } from "./cache";
import type {
  AiClientConfig,
  AiFeature,
  AiResponse,
  AiStreamHandlers,
  AiUsageRecord,
} from "./types";

/**
 * The AI Service Layer — one object exposing every feature. It orchestrates
 * context building, prompt building, the provider-agnostic client, response
 * parsing, conversation memory and action execution. UI components call
 * these methods; they never see prompts, providers or context assembly.
 */

export type AiServiceDeps = {
  /** Fresh snapshots (read at call time so context is never stale). */
  studySnapshot: () => StudySnapshot;
  knowledgeSnapshot: () => KnowledgeSnapshot;
  /** Live client config + cache/usage/budget hooks. */
  getConfig: () => AiClientConfig;
  cache: {
    get: (key: string) => AiCacheEntry | null;
    put: (key: string, entry: AiCacheEntry) => void;
  };
  onUsage: (record: AiUsageRecord) => void;
  usedTokensToday: () => number;
  /** The action gateway (existing store actions) + memory recorders. */
  gateway: AiActionGateway;
  recordDecision: (description: string, accepted: boolean) => void;
  logActivity: (entry: {
    kind: "feature" | "action";
    label: string;
    detail: string;
    ok: boolean;
  }) => void;
  /** Conversation memory access (for mentor chat). */
  getConversation: (id: string) => AiConversation | null;
  getMentorMemory: () => MentorMemory;
  appendMessage: (
    conversationId: string,
    message: AiConversation["messages"][number],
  ) => void;
  setConversationSummary: (
    conversationId: string,
    summary: string,
    coveredThrough: number,
  ) => void;
  makeId: (prefix: string) => string;
  /* Test injectables. */
  now?: () => number;
  fetchImpl?: typeof fetch;
};

export type AiService = ReturnType<typeof createAiService>;

export function createAiService(deps: AiServiceDeps) {
  const client: AiClient = createAiClient({
    getConfig: deps.getConfig,
    cache: deps.cache,
    onUsage: deps.onUsage,
    usedTokensToday: deps.usedTokensToday,
    fetchImpl: deps.fetchImpl,
    now: deps.now,
  });

  const now = deps.now ?? Date.now;
  const nowIso = () => new Date(now()).toISOString();

  /** A cheap non-fatal wrapper: logs activity, never throws to the UI. */
  function activity(feature: AiFeature, ok: boolean, detail: string) {
    deps.logActivity({ kind: "feature", label: feature, detail, ok });
  }

  /* ---- One-shot text features (with optional caching) ---- */

  async function oneShot(
    built: BuiltPrompt,
    feature: AiFeature,
    options: { cache?: boolean; bypassCache?: boolean; interactive?: boolean } = {},
  ): Promise<AiResponse> {
    try {
      const response = await client.request(built.request, {
        feature,
        promptVersion: built.version,
        cache: options.cache,
        bypassCache: options.bypassCache,
        interactive: options.interactive,
      });
      activity(feature, true, response.cached ? "cache hit" : response.model);
      return response;
    } catch (error) {
      activity(feature, false, error instanceof Error ? error.message : "failed");
      throw error;
    }
  }

  function topicContext(topicId: string) {
    return buildTopicContext({
      topicId,
      study: deps.studySnapshot(),
      knowledge: deps.knowledgeSnapshot(),
      budgetTokens: AI_CONFIG.contextBudget.topic,
    });
  }

  function studyContext(budget: number = AI_CONFIG.contextBudget.mentor) {
    return buildStudyContext({
      study: deps.studySnapshot(),
      budgetTokens: budget,
    });
  }

  const titleOf = (topicId: string) => getNode(topicId)?.title ?? topicId;

  return {
    client,
    isConfigured: () => client.isConfigured(),
    configuredProviders: () => client.configuredProviders(),
    resolveChain: client.resolveChain,

    /* ---- Knowledge workspace ---- */

    async summarizeTopic(topicId: string, bypassCache = false) {
      const built = buildTopicSummaryPrompt({
        topicTitle: titleOf(topicId),
        context: topicContext(topicId),
      });
      const response = await oneShot(built, "topic-summary", {
        cache: true,
        bypassCache,
      });
      return response.text;
    },

    async explainTopic(topicId: string, question?: string) {
      const built = buildExplainTopicPrompt({
        topicTitle: titleOf(topicId),
        context: topicContext(topicId),
        question,
      });
      const response = await oneShot(built, "topic-explanation", {
        cache: !question,
      });
      return response.text;
    },

    async mnemonics(topicId: string, bypassCache = false) {
      const built = buildMnemonicsPrompt({
        topicTitle: titleOf(topicId),
        context: topicContext(topicId),
      });
      const response = await oneShot(built, "mnemonics", {
        cache: true,
        bypassCache,
      });
      return response.text;
    },

    async simplifyNotes(topicId: string, noteMarkdown: string) {
      const built = buildSimplifyNotesPrompt({
        topicTitle: titleOf(topicId),
        noteMarkdown,
      });
      const response = await oneShot(built, "note-simplification", {
        cache: true,
      });
      return response.text;
    },

    async improveNotes(topicId: string) {
      const built = buildImproveNotesPrompt({
        topicTitle: titleOf(topicId),
        context: topicContext(topicId),
      });
      const response = await oneShot(built, "note-improvement", { cache: true });
      return response.text;
    },

    async generateFlashcards(
      topicId: string,
      count: number,
    ): Promise<FlashcardDraft[]> {
      const knowledge = deps.knowledgeSnapshot();
      const existing = Object.values(knowledge.flashcards)
        .filter((card) => card.topicId === topicId)
        .map((card) => card.front);
      const built = buildFlashcardsPrompt({
        topicTitle: titleOf(topicId),
        context: topicContext(topicId),
        count,
      });
      const response = await oneShot(built, "flashcard-generation", {});
      return parseFlashcardDrafts(response.text, existing);
    },

    async generateQuiz(
      topicId: string,
      count: number,
      difficulty: QuizDifficulty,
    ): Promise<QuizQuestion[]> {
      const built = buildQuizPrompt({
        topicTitle: titleOf(topicId),
        context: topicContext(topicId),
        count,
        difficulty,
      });
      const response = await oneShot(built, "quiz-generation", {});
      let questions = parseQuiz(response.text);
      if (questions.length === 0) {
        // One repair retry (json mode occasionally returns prose).
        const retry = await oneShot(built, "quiz-generation", {
          bypassCache: true,
        });
        questions = parseQuiz(retry.text);
      }
      return questions;
    },

    /* ---- Dashboard & analytics ---- */

    async dailyBriefing(bypassCache = false) {
      const today = todayStr();
      const built = buildDailyBriefingPrompt({
        context: studyContext(AI_CONFIG.contextBudget.briefing),
        today,
      });
      const response = await oneShot(built, "daily-briefing", {
        cache: true,
        bypassCache,
      });
      return response.text;
    },

    async explainAnalytics(subject: AnalyticsSubject) {
      const built = buildAnalyticsExplanationPrompt({
        subject,
        context: studyContext(AI_CONFIG.contextBudget.analytics),
      });
      const response = await oneShot(built, "analytics-explanation", {
        cache: true,
      });
      return response.text;
    },

    /* ---- Current affairs & PYQ ---- */

    async analyzeCurrentAffair(affairId: string) {
      const knowledge = deps.knowledgeSnapshot();
      const affair = knowledge.currentAffairs[affairId];
      if (!affair) throw new Error("Current affair not found.");
      const built = buildCurrentAffairsPrompt({
        title: affair.title,
        date: affair.date,
        source: affair.source,
        summary: affair.summary,
        linkedTopicTitles: affair.topicIds.map(titleOf),
      });
      const response = await oneShot(built, "current-affairs-analysis", {
        cache: true,
      });
      return response.text;
    },

    async analyzePyq(pyqId: string) {
      const knowledge = deps.knowledgeSnapshot();
      const pyq = knowledge.pyqs[pyqId];
      if (!pyq) throw new Error("PYQ not found.");
      const built = buildPyqAnalysisPrompt({
        question: pyq.question,
        year: pyq.year,
        paper: pyq.paper,
        marks: pyq.marks,
        context: topicContext(pyq.topicId),
      });
      const response = await oneShot(built, "pyq-analysis", { cache: true });
      return response.text;
    },

    /* ---- Planner advice (non-streaming; proposes actions) ---- */

    async plannerAdvice(question: string) {
      const built = buildPlannerAdvicePrompt({
        context: studyContext(AI_CONFIG.contextBudget.planner),
        question,
      });
      const response = await oneShot(built, "planner-advice", {
        interactive: true,
      });
      return response.text;
    },

    /* ---- Chanakya mentor chat (streaming + memory + actions) ---- */

    async mentorChat(
      input: { conversationId: string; userMessage: string; topicId: string | null },
      handlers: AiStreamHandlers,
    ): Promise<AiResponse> {
      const conversation = deps.getConversation(input.conversationId);
      const feature: AiFeature = "mentor-chat";

      // Persist the user's turn first so it survives a mid-stream failure.
      deps.appendMessage(input.conversationId, {
        id: deps.makeId("msg"),
        role: "user",
        content: input.userMessage,
        at: nowIso(),
      });

      const context = input.topicId
        ? buildTopicContext({
            topicId: input.topicId,
            study: deps.studySnapshot(),
            knowledge: deps.knowledgeSnapshot(),
            budgetTokens: AI_CONFIG.contextBudget.topic,
          })
        : studyContext(AI_CONFIG.contextBudget.mentor);

      const memoryText = renderMemory(
        deps.getMentorMemory(),
        conversation?.summary ?? "",
      );

      const built = buildMentorChatPrompt({
        context,
        memory: memoryText,
        window: conversation ? conversationWindow(conversation) : [],
        userMessage: input.userMessage,
      });

      try {
        const response = await client.stream(built.request, handlers, {
          feature,
          promptVersion: built.version,
          interactive: true,
        });
        deps.appendMessage(input.conversationId, {
          id: deps.makeId("msg"),
          role: "assistant",
          content: response.text,
          at: nowIso(),
          provider: response.provider,
        });
        activity(feature, true, response.model);
        // Fold older turns into the running summary when it grows.
        await this.maybeSummarize(input.conversationId);
        return response;
      } catch (error) {
        activity(feature, false, error instanceof Error ? error.message : "failed");
        throw error;
      }
    },

    async revisionCoach(
      input: {
        conversationId: string;
        topicId: string;
        revisionRound: number;
        userMessage: string;
      },
      handlers: AiStreamHandlers,
    ): Promise<AiResponse> {
      const conversation = deps.getConversation(input.conversationId);
      deps.appendMessage(input.conversationId, {
        id: deps.makeId("msg"),
        role: "user",
        content: input.userMessage,
        at: nowIso(),
      });
      const built = buildRevisionCoachPrompt({
        topicTitle: titleOf(input.topicId),
        revisionRound: input.revisionRound,
        context: buildTopicContext({
          topicId: input.topicId,
          study: deps.studySnapshot(),
          knowledge: deps.knowledgeSnapshot(),
          budgetTokens: AI_CONFIG.contextBudget.topic,
        }),
        window: conversation ? conversationWindow(conversation) : [],
        userMessage: input.userMessage,
      });
      const response = await client.stream(built.request, handlers, {
        feature: "revision-coach",
        promptVersion: built.version,
        interactive: true,
      });
      deps.appendMessage(input.conversationId, {
        id: deps.makeId("msg"),
        role: "assistant",
        content: response.text,
        at: nowIso(),
        provider: response.provider,
      });
      return response;
    },

    /** Summarize a conversation's overflow into long-term memory when it
     * grows past the window (runs quietly; failure is non-fatal). */
    async maybeSummarize(conversationId: string) {
      const conversation = deps.getConversation(conversationId);
      if (!conversation || !needsSummary(conversation)) return;
      const turns = overflowMessages(conversation).map((message) => ({
        role: message.role,
        content: message.content,
      }));
      const coveredThrough =
        conversation.messages.length - AI_CONFIG.memory.windowTurns;
      const built = buildConversationSummaryPrompt({
        existingSummary: conversation.summary,
        turns,
      });
      try {
        const response = await client.request(built.request, {
          feature: "mentor-chat",
          promptVersion: built.version,
        });
        deps.setConversationSummary(
          conversationId,
          response.text,
          coveredThrough,
        );
      } catch {
        // Leave the summary as-is; it retries on the next long turn.
      }
    },

    /* ---- Action execution ---- */

    /** Execute confirmed actions through the gateway; record decisions in
     * memory so the mentor learns what the user accepts. */
    executeActions(actions: AiAction[]): { action: AiAction; ok: boolean; message: string }[] {
      return actions.map((action) => {
        const result = executeAiAction(action, deps.gateway);
        deps.recordDecision(describeAiAction(action), result.ok);
        deps.logActivity({
          kind: "action",
          label: action.kind,
          detail: result.message,
          ok: result.ok,
        });
        return { action, ...result };
      });
    },

    /** Record that the user dismissed proposed actions (learning signal). */
    rejectActions(actions: AiAction[]) {
      for (const action of actions) {
        deps.recordDecision(describeAiAction(action), false);
      }
    },
  };
}
