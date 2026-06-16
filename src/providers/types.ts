import type { DiffContext, Finding } from "../core/types.js";

export interface AiReviewRequest {
  context: DiffContext;
  perspectives: string[];
  model: string;
  architectureRules: string[];
}

export interface AiReviewResponse {
  findings: Finding[];
  skipped: boolean;
  skipReason?: string;
  model?: string;
  tokensUsed?: number;
}

export interface AiProvider {
  name: string;
  isAvailable(): boolean;
  unavailableReason(): string;
  review(request: AiReviewRequest): Promise<AiReviewResponse>;
}