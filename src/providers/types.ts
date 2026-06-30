import type { DiffContext, Finding } from "../core/types.js";

export interface AiReviewRequest {
  context: DiffContext;
  perspectives: string[];
  model: string;
  architectureRules: string[];
  ollamaBaseUrl?: string;
}

export interface AiProviderError {
  status: number | string;
  message: string;
}

export interface AiReviewResponse {
  findings: Finding[];
  skipped: boolean;
  skipReason?: string;
  model?: string;
  tokensUsed?: number;
  error?: AiProviderError;
}

export interface AiProvider {
  name: string;
  isAvailable(): boolean;
  unavailableReason(): string;
  review(request: AiReviewRequest): Promise<AiReviewResponse>;
}