import { AiError } from "@/lib/ai/types";

/** Turn any thrown value into a calm, actionable sentence for the user. */
export function friendlyAiError(error: unknown): string {
  if (!(error instanceof AiError)) {
    return error instanceof Error ? error.message : "Something went wrong.";
  }
  switch (error.kind) {
    case "not-configured":
      return "Add an API key in Settings → AI to use Chanakya.";
    case "auth":
      return "That API key was rejected. Check it in Settings → AI.";
    case "rate-limit":
      return "The AI provider is rate-limiting requests. Try again shortly.";
    case "overloaded":
      return "The AI provider is busy right now. Please try again in a moment.";
    case "network":
      return "Couldn't reach the AI provider — check your connection.";
    case "content":
      return "The model declined to answer that. Try rephrasing.";
    case "budget":
      return error.message;
    case "bad-request":
      return "The request was rejected by the provider. Try a shorter prompt.";
    case "aborted":
      return "";
    default:
      return error.message;
  }
}
