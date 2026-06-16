import type { Finding } from "../core/types.js";
import type { AiProvider, AiReviewRequest, AiReviewResponse } from "./types.js";

export class AnthropicProvider implements AiProvider {
  name = "anthropic";

  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }

  unavailableReason(): string {
    return "ANTHROPIC_API_KEY is not set.";
  }

  async review(request: AiReviewRequest): Promise<AiReviewResponse> {
    if (!this.isAvailable()) {
      return { findings: [], skipped: true, skipReason: this.unavailableReason() };
    }

    const perspectives = request.perspectives;
    const allFindings: Finding[] = [];

    for (const perspective of perspectives) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: `You are a ${perspective} PR reviewer. Return JSON array of findings with severity, category, title, reason, suggestedAction, confidence, evidence.\n\nDiff:\n${request.context.diff.slice(0, 8000)}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        content?: Array<{ text?: string }>;
      };
      const text = data.content?.[0]?.text ?? "[]";
      try {
        const parsed = JSON.parse(text) as Finding[] | { findings: Finding[] };
        const findings = Array.isArray(parsed) ? parsed : parsed.findings ?? [];
        allFindings.push(...findings.map((f, i) => ({ ...f, id: f.id ?? `anthropic-${perspective}-${i}`, category: f.category ?? perspective })));
      } catch {
        // skip malformed
      }
    }

    return {
      findings: allFindings,
      skipped: false,
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022",
    };
  }
}