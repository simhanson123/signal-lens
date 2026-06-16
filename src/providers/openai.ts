import type { Finding } from "../core/types.js";
import type { AiProvider, AiReviewRequest, AiReviewResponse } from "./types.js";

const SYSTEM_PROMPT = `You are a maintainer-level PR reviewer for open-source projects.
Analyze the provided diff and repository context. Return ONLY a JSON array of findings.
Each finding must have: severity (blocker|high|medium|low), category, title, reason,
suggestedAction, confidence (0-1), evidence (array of {file, line?, snippet?}).
Focus on issues diff-only review misses: CI weakening, duplicate utilities, security boundaries, missing tests.
Report only actionable issues with evidence. Return [] if no issues found.`;

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
      return {
        findings: [],
        skipped: true,
        skipReason: this.unavailableReason(),
      };
    }

    const userPrompt = buildUserPrompt(request);

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
        const errText = await response.text();
        return {
          findings: [],
          skipped: true,
          skipReason: `OpenAI API error (${response.status}): ${errText.slice(0, 200)}`,
        };
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content ?? "[]";
      const findings = parseFindings(content);

      return {
        findings,
        skipped: false,
        model: request.model,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      return {
        findings: [],
        skipped: true,
        skipReason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

function buildUserPrompt(request: AiReviewRequest): string {
  const { context, perspectives, architectureRules } = request;

  const fileList = context.changedFiles
    .map((f) => `- ${f.path} (${f.category}, +${f.additions}/-${f.deletions})`)
    .join("\n");

  const rules =
    architectureRules.length > 0
      ? architectureRules.map((r) => `- ${r}`).join("\n")
      : "(none configured)";

  const truncatedDiff =
    context.diff.length > 12000
      ? context.diff.slice(0, 12000) + "\n... [diff truncated]"
      : context.diff;

  return JSON.stringify({
    task: "Review this pull request diff",
    perspectives,
    changedFiles: fileList,
    architectureRules: rules,
    diff: truncatedDiff,
    outputSchema: {
      findings: [
        {
          severity: "blocker|high|medium|low",
          category: "string",
          title: "string",
          reason: "string",
          suggestedAction: "string",
          confidence: "0-1",
          evidence: [{ file: "string", line: "number?", snippet: "string?" }],
        },
      ],
    },
  });
}

function parseFindings(content: string): Finding[] {
  try {
    const parsed = JSON.parse(content) as {
      findings?: Array<Partial<Finding>>;
    };

    const raw = Array.isArray(parsed)
      ? (parsed as Array<Partial<Finding>>)
      : (parsed.findings ?? []);

    return raw
      .filter((f) => f.title && f.severity)
      .map((f, i) => ({
        id: f.id ?? `ai-${i}`,
        severity: validateSeverity(f.severity),
        category: f.category ?? "ai-review",
        title: f.title!,
        reason: f.reason ?? "AI-detected issue",
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