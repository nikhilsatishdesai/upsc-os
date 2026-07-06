"use client";

import * as React from "react";

import { makeId } from "@/lib/id";
import { createAiService, type AiService } from "@/lib/ai/service";
import type { AiActionGateway } from "@/lib/ai/actions";
import type { KnowledgeSnapshot, StudySnapshot } from "@/lib/ai/context";
import { useAppStore } from "@/store/app-store";
import { useKnowledgeStore } from "@/store/knowledge-store";
import {
  aiClientConfig,
  useAiStore,
  usedTokensToday,
} from "@/store/ai-store";

/**
 * The single hook every AI-aware component uses. It wires the pure AI
 * service to the three live stores. Snapshots are read lazily at call
 * time, so the service always sees current state without re-rendering on
 * every store change (AI state stays separate from planner state — the
 * performance rule in the Phase C spec).
 */
export function useAiService(): AiService {
  return React.useMemo(() => {
    const app = useAppStore;
    const knowledge = useKnowledgeStore;
    const ai = useAiStore;

    const studySnapshot = (): StudySnapshot => {
      const state = app.getState();
      return {
        topics: state.topics,
        tasks: state.tasks,
        planner: state.planner,
        examDate: state.examDate,
        displayName: state.displayName,
      };
    };

    const knowledgeSnapshot = (): KnowledgeSnapshot => {
      const state = knowledge.getState();
      return {
        richNotes: state.richNotes,
        quickNotes: state.quickNotes,
        flashcards: state.flashcards,
        keywords: state.keywords,
        bookRefs: state.bookRefs,
        pyqs: state.pyqs,
        currentAffairs: state.currentAffairs,
        events: state.events,
      };
    };

    const gateway: AiActionGateway = {
      regeneratePlan: () => app.getState().regeneratePlan(),
      planTopicNow: (topicId, when) =>
        app.getState().planTopicNow(topicId, when),
      moveTask: (taskId, date, slot) =>
        app.getState().moveTask(taskId, date, slot),
      setTopicMeta: (topicId, meta) =>
        app.getState().setTopicMeta(topicId, meta),
      setPlanState: (topicId, planState) =>
        app.getState().setPlanState(topicId, planState),
      addFlashcard: (topicId, card) =>
        knowledge.getState().addFlashcard(topicId, card),
      addQuickNote: (topicId, text, kind) =>
        knowledge.getState().addQuickNote(topicId, text, kind),
      addBookmark: (topicId, collectionId) =>
        knowledge
          .getState()
          .addBookmark("topic", topicId, topicId, collectionId),
      updatePlannerSettings: (patch) => {
        if (!app.getState().planner) return false;
        app.getState().patchPlanner(patch);
        return true;
      },
      hasTask: (taskId) => !!app.getState().tasks[taskId],
    };

    return createAiService({
      studySnapshot,
      knowledgeSnapshot,
      getConfig: () => aiClientConfig(ai.getState()),
      cache: {
        get: (key) => ai.getState().getCached(key),
        put: (key, entry) => ai.getState().putCached(key, entry),
      },
      onUsage: (record) => ai.getState().recordUsage(record),
      usedTokensToday: () => usedTokensToday(ai.getState().usage),
      gateway,
      recordDecision: (description, accepted) =>
        ai.getState().recordActionDecision(description, accepted),
      logActivity: (entry) => ai.getState().logActivity(entry),
      getConversation: (id) => ai.getState().conversations[id] ?? null,
      getMentorMemory: () => ai.getState().memory,
      appendMessage: (conversationId, message) =>
        ai.getState().appendMessage(conversationId, message),
      setConversationSummary: (conversationId, summary, coveredThrough) =>
        ai
          .getState()
          .setConversationSummary(conversationId, summary, coveredThrough),
      makeId,
    });
  }, []);
}
