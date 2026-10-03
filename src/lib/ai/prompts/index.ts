/** The prompt system's public surface. Components never build prompts —
 * services call these builders; each is versioned and unit-tested. */
export { composeSystem, type BuiltPrompt } from "./types";
export { CHANAKYA_PERSONA, CHANAKYA_GENERATOR } from "./persona";
export {
  buildMentorChatPrompt,
  buildDailyBriefingPrompt,
  buildConversationSummaryPrompt,
  MENTOR_CHAT_VERSION,
  DAILY_BRIEFING_VERSION,
  CONVERSATION_SUMMARY_VERSION,
} from "./mentor";
export {
  buildTopicSummaryPrompt,
  buildExplainTopicPrompt,
  buildMnemonicsPrompt,
  buildSimplifyNotesPrompt,
  buildImproveNotesPrompt,
  buildFlashcardsPrompt,
  buildQuizPrompt,
  TOPIC_SUMMARY_VERSION,
  TOPIC_EXPLANATION_VERSION,
  MNEMONICS_VERSION,
  SIMPLIFY_NOTES_VERSION,
  IMPROVE_NOTES_VERSION,
  FLASHCARDS_VERSION,
  QUIZ_VERSION,
  type QuizDifficulty,
} from "./knowledge";
export {
  buildPlannerAdvicePrompt,
  buildRevisionCoachPrompt,
  PLANNER_ADVICE_VERSION,
  REVISION_COACH_VERSION,
  PLANNER_INTENTS,
  type PlannerIntent,
} from "./planner";
export {
  buildAnalyticsExplanationPrompt,
  buildCurrentAffairsPrompt,
  buildPyqAnalysisPrompt,
  buildEssayFeedbackPrompt,
  buildInterviewPracticePrompt,
  ANALYTICS_EXPLANATION_VERSION,
  CURRENT_AFFAIRS_VERSION,
  PYQ_ANALYSIS_VERSION,
  ESSAY_FEEDBACK_VERSION,
  INTERVIEW_PRACTICE_VERSION,
  type AnalyticsSubject,
} from "./analysis";
export {
  buildAnswerEvaluationPrompt,
  ANSWER_EVALUATION_VERSION,
} from "./answers";
