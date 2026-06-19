import type { Finding } from "../core/types.js";
import type { AiProvider, AiReviewRequest, AiReviewResponse } from "./types.js";

const DEFAULT_BASE = "http://localhost:11434";
const SYSTEM_PROMPT = `You are a maintainer-level PR reviewer. Return ONLY JSON: {"findings":[...]}
Each finding needs: severity (blocker|high|medium|low), category, title, reason, suggestedAction, confidence (0-1), evidence ([{file,line?,snippet?}]).
Report only actionable issues with evidence. Use empty findings array if none.`;

export class OllamaProvider implements AiProvider {
  name = "ollama";

  isAvailable(): boolean {
    const forced = process.env.SIGNAL_LENS_PROVIDER;
    if (forced && forced !== "ollama") return false;
    return true;
  }

  unavailableReason(): string {
    return "Ollama not reachable. Install from https://ollama.com and run: ollama pull qwen2.5-coder:7b";
  }

  async review(request: AiReviewRequest): Promise<AiReviewResponse> {
    const baseUrl = request.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE;
    const model = request.model || process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

    const reachable = await this.ping(baseUrl);
    if (!reachable) {
      return { findings: [], skipped: true, skipReason: this.unavailableReason() };
    }

    const allFindings: Finding[] = [];

    for (const perspective of request.perspectives) {
      const findings = await this.callPerspective(baseUrl, model, request, perspective);
      allFindings.push(...findings);
    }

    return {
      findings: dedupe(allFindings),
      skipped: false,
      model: `ollama/${model}`,
    };
  }

  private async ping(baseUrl: string): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async callPerspective(
    baseUrl: string,
    model: string,
    request: AiReviewRequest,
    perspective: string
  ): Promise<Finding[]> {
    const diff =
      request.context.diff.length > 8000
        ? request.context.diff.slice(0, 8000) + "\n... [truncated]"
        : request.context.diff;

    const prompt = [
      `Perspective: ${perspective}`,
      `Architecture rules: ${request.architectureRules.join("; ") || "none"}`,
      `Changed files: ${request.context.changedFiles.map((f) => f.path).join(", ")}`,
      `Diff:\n${diff}`,
    ].join("\n\n");

    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        return [];
      }

      const data = (await res.json()) as { message?: { content?: string } };
      return parseFindings(data.message?.content ?? '{"findings":[]}', perspective);
    } catch {
      return [];
    }
  }
}

function parseFindings(content: string, perspective: string): Finding[] {
  try {
    const parsed = JSON.parse(content) as { findings?: Array<Partial<Finding>> };
    const raw = parsed.findings ?? [];

    return raw
      .filter((f) => f.title && f.severity)
      .map((f, i) => ({
        id: f.id ?? `ollama-${perspective}-${i}`,
        severity: validateSeverity(f.severity),
        category: f.category ?? `ai-${perspective}`,
        title: f.title!,
        reason: f.reason ?? `${perspective} review finding`,
        evidence: f.evidence ?? [],
        suggestedAction: f.suggestedAction ?? "Review and address if confirmed",
        confidence: typeof f.confidence === "number" ? f.confidence : 0.55,
      }));
  } catch {
    return [];
  }
}

function validateSeverity(v: unknown): Finding["severity"] {
  if (typeof v === "string" && ["blocker", "high", "medium", "low"].includes(v)) {
    return v as Finding["severity"];
  }
  return "medium";
}

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const k = `${f.title}:${f.evidence[0]?.file ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}