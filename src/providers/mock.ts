import type { AiProvider, AiReviewRequest, AiReviewResponse } from "./types.js";

/** Deterministic provider for tests and offline demos. */
export class MockProvider implements AiProvider {
  name = "mock";

  isAvailable(): boolean {
    return process.env.SIGNAL_LENS_PROVIDER === "mock" || process.env.NODE_ENV === "test";
  }

  unavailableReason(): string {
    return "Set SIGNAL_LENS_PROVIDER=mock to enable mock provider.";
  }

  async review(request: AiReviewRequest): Promise<AiReviewResponse> {
    if (!this.isAvailable()) {
      return { findings: [], skipped: true, skipReason: this.unavailableReason() };
    }

    const hasCi = request.context.changedFiles.some((f) => f.category === "ci");
    const findings = hasCi
      ? [
          {
            id: "mock-ci-1",
            severity: "medium" as const,
            category: "ai-review",
            title: "AI perspective: verify CI changes",
            reason: "Mock provider detected CI file changes requiring maintainer attention.",
            evidence: request.context.changedFiles
              .filter((f) => f.category === "ci")
              .map((f) => ({ file: f.path })),
            suggestedAction: "Review CI configuration changes carefully.",
            confidence: 0.7,
          },
        ]
      : [];

    return { findings, skipped: false, model: "mock" };
  }
}