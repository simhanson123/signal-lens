import { stableFindingId } from "../core/finding-id.js";
import type { Analyzer, DiffContext, Finding } from "../core/types.js";

const ENTROPY_THRESHOLD = 4.5;
const MIN_LENGTH = 20;
const SECRET_NAME_PATTERN = /\b(?:key|secret|token|password|api|auth|credential|private)[\w]*\b/i;

export function shannonEntropy(str: string): number {
  if (str.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of str) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  const len = str.length;
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function getAssignmentTarget(content: string): string {
  let m = content.match(/(?:const|let|var)\s+(\w+)/);
  if (m) return m[1];
  m = content.match(/(\w+)\s*:\s*["'`]/);
  if (m) return m[1];
  m = content.match(/(\w+)\s*=\s*["'`]/);
  if (m) return m[1];
  return "";
}

export function extractStringLiterals(content: string): string[] {
  const results: string[] = [];
  const regexes = [/"([^"\n]+)"/g, /'([^'\n]+)'/g, /`([^`\n]+)`/g];
  for (const regex of regexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      results.push(match[1]);
    }
  }
  return results;
}

export const secretEntropyAnalyzer: Analyzer = {
  name: "secret-entropy",

  async analyze(context: DiffContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    let currentFile = "";

    for (const rawLine of context.diff.split("\n")) {
      if (rawLine.startsWith("+++ b/")) {
        currentFile = rawLine.slice(6);
        continue;
      }
      if (!rawLine.startsWith("+") || rawLine.startsWith("+++")) continue;

      const content = rawLine.slice(1);
      const targetName = getAssignmentTarget(content);

      if (!SECRET_NAME_PATTERN.test(targetName)) continue;

      for (const value of extractStringLiterals(content)) {
        if (value.length < MIN_LENGTH) continue;

        const entropy = shannonEntropy(value);
        if (entropy < ENTROPY_THRESHOLD) continue;

        const masked = value.length > 12 ? value.slice(0, 4) + "…" + value.slice(-4) : "…";
        findings.push({
          id: stableFindingId("secret", "Hardcoded high-entropy secret", currentFile, value.slice(0, 40)),
          severity: "high",
          category: "secret-entropy",
          title: "Possible hardcoded secret detected",
          reason: `String assigned to "${targetName}" has Shannon entropy ${entropy.toFixed(2)} over ${value.length} characters — consistent with an API key, token, or password rather than a human-readable value.`,
          evidence: [{ file: currentFile, snippet: `${targetName} = "${masked}"` }],
          suggestedAction: "Move secrets to environment variables or a secrets manager. Rotate the key if it may have been committed.",
          confidence: 0.7,
        });
      }
    }

    return findings;
  },
};
