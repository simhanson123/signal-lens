import type { Finding } from "../core/types.js";
import type { AiProvider, AiProviderError, AiReviewRequest, AiReviewResponse } from "./types.js";
import { httpError, NETWORK_ERROR } from "./http-error.js";

const SYSTEM_PROMPT = `You are a maintainer-level PR reviewer. Return ONLY JSON: {"findings":[...]}
Each finding: severity (blocker|high|medium|low), category, title, reason, suggestedAction, confidence (0-1), evidence ([{file,line?,snippet?}]).
Report only actionable issues with evidence. Return empty array if none.`;

export class OpenAiProvider implements AiProvider {
  name = "openai";

  isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  unavailableReason(): string {
    return "OPENAI_API_KEY is not set. Running static analyzers only.";
  }

  async review(request: AiReviewRequest): Promise<AiReviewResponse> {
    if (!this.isAvailable()) {
      return { findings: [], skipped: true, skipReason: this.unavailableReason() };
    }

    const allFindings: Finding[] = [];
    let tokensUsed = 0;
    let firstError: AiProviderError | undefined;

    for (const perspective of request.perspectives) {
      const response = await this.callPerspective(request, perspective);
      tokensUsed += response.tokens ?? 0;
      allFindings.push(...response.findings);
      if (!firstError && response.error) firstError = response.error;
    }

    return {
      findings: dedupeFindings(allFindings),
      skipped: false,
      model: request.model,
      tokensUsed,
      error: firstError,
    };
  }

  private async callPerspective(
    request: AiReviewRequest,
    perspective: string
  ): Promise<{ findings: Finding[]; tokens: number; error?: AiProviderError }> {
    const userPrompt = buildUserPrompt(request, perspective);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: request.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        return { findings: [], tokens: 0, error: httpError(response.status) };
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content ?? '{"findings":[]}';
      const findings = parseFindings(content, perspective);

      return { findings, tokens: data.usage?.total_tokens ?? 0 };
    } catch {
      return { findings: [], tokens: 0, error: NETWORK_ERROR };
    }
  }
}

function buildUserPrompt(request: AiReviewRequest, perspective: string): string {
  const truncatedDiff =
    request.context.diff.length > 10000
      ? request.context.diff.slice(0, 10000) + "\n... [truncated]"
      : request.context.diff;

  return JSON.stringify({
    perspective,
    architectureRules: request.architectureRules,
    changedFiles: request.context.changedFiles.map((f) => ({
      path: f.path,
      category: f.category,
      additions: f.additions,
      deletions: f.deletions,
    })),
    prSummary: request.context.summary,
    diff: truncatedDiff,
  });
}

function parseFindings(content: string, perspective: string): Finding[] {
  try {
    const parsed = JSON.parse(content) as { findings?: Array<Partial<Finding>> };
    const raw = parsed.findings ?? [];

    return raw
      .filter((f) => f.title && f.severity)
      .map((f, i) => ({
        id: f.id ?? `ai-${perspective}-${i}`,
        severity: validateSeverity(f.severity),
        category: f.category ?? `ai-${perspective}`,
        title: f.title!,
        reason: f.reason ?? `${perspective} perspective flagged this issue`,
        evidence: f.evidence ?? [],
        suggestedAction: f.suggestedAction ?? "Review and address if confirmed",
        confidence: typeof f.confidence === "number" ? f.confidence : 0.6,
        repro: f.repro,
      }));
  } catch {
    return [];
  }
}

function validateSeverity(value: unknown): Finding["severity"] {
  const valid = ["blocker", "high", "medium", "low"];
  if (typeof value === "string" && valid.includes(value)) {
    return value as Finding["severity"];
  }
  return "medium";
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.title}:${f.evidence[0]?.file ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}