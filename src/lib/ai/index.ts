/** Public surface of the AI subsystem. UI imports from here (and the
 * service hook) — never from a provider adapter directly. */
export * from "./types";
export { AI_CONFIG, AI_PROVIDERS, resolveModelInfo } from "./config";
export { createAiClient, type AiClient, type AiRunOptions } from "./client";
export {
  buildTopicContext,
  buildStudyContext,
  weakTopics,
  upcomingRevisions,
  renderContext,
  type ContextBundle,
  type KnowledgeSnapshot,
  type StudySnapshot,
  type WeakTopic,
  type UpcomingRevision,
} from "./context";
export {
  parseAiActions,
  validateAiAction,
  executeAiAction,
  describeAiAction,
  stripActionBlock,
  ACTION_PROTOCOL,
  type AiAction,
  type AiActionGateway,
  type AiActionResult,
} from "./actions";
export {
  parseFlashcardDrafts,
  parseQuiz,
  parseJsonLoose,
  type FlashcardDraft,
  type QuizQuestion,
} from "./structured";
export * from "./prompts";
export {
  conversationWindow,
  needsSummary,
  overflowMessages,
  type AiChatMessage,
  type AiConversation,
  type MentorMemory,
} from "./memory";
export { estimateTokens, estimateRequestTokens } from "./tokens";
