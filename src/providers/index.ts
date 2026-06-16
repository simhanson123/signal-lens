import { OpenAiProvider } from "./openai.js";
import type { AiProvider } from "./types.js";

let defaultProvider: AiProvider | null = null;

export function getDefaultProvider(): AiProvider {
  if (!defaultProvider) {
    defaultProvider = new OpenAiProvider();
  }
  return defaultProvider;
}

export { OpenAiProvider };
export type { AiProvider, AiReviewRequest, AiReviewResponse } from "./types.js";