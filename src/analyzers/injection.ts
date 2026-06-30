import { stableFindingId } from "../core/finding-id.js";
import type { Analyzer, DiffContext, Finding } from "../core/types.js";

interface InjectionPattern {
  regex: RegExp;
  title: string;
  reason: string;
  severity: Finding["severity"];
  action: string;
  confidence: number;
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  {
    regex: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE\s+TABLE)\b[\s\S]*\$\{/i,
    title: "Possible SQL injection via string interpolation",
    reason: "A SQL statement uses template interpolation, allowing untrusted values to enter the query.",
    severity: "high",
    action: "Use parameterized queries or an ORM instead of interpolating values into SQL strings.",
    confidence: 0.8,
  },
  {
    regex: /(?:['"]\s*\+\s*\w+.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE))/i,
    title: "Possible SQL injection via string concatenation",
    reason: "SQL built via string concatenation is vulnerable to injection if any segment is untrusted.",
    severity: "high",
    action: "Use parameterized queries or prepared statements.",
    confidence: 0.7,
  },
  {
    regex: /(?:\.\.\/){2,}/,
    title: "Possible path traversal",
    reason: "Multiple parent-directory references (../../) can escape intended file boundaries.",
    severity: "high",
    action: "Validate and sanitize file paths; use path.resolve and restrict to allowed directories.",
    confidence: 0.75,
  },
  {
    regex: /(?:exec|execSync|spawn|spawnSync)\s*\([^)]*(?:\$\{|process\.argv|req\.)/i,
    title: "Possible command injection",
    reason: "A shell command is built with user-controlled input, enabling command injection.",
    severity: "blocker",
    action: "Use argument arrays (execFile) instead of shell strings; validate all inputs.",
    confidence: 0.85,
  },
  {
    regex: /yaml\.load\s*\([^)]*\)\s*(?!.*Loader)/,
    title: "Unsafe YAML deserialization",
    reason: "yaml.load without a SafeLoader can execute arbitrary Python/JS objects.",
    severity: "high",
    action: "Use yaml.safe_load or pass Loader=yaml.SafeLoader.",
    confidence: 0.85,
  },
  {
    regex: /pickle\.loads?\s*\(/,
    title: "Unsafe pickle deserialization",
    reason: "pickle.loads on untrusted input enables arbitrary code execution.",
    severity: "high",
    action: "Avoid pickle for untrusted data; use JSON or a schema-validated format.",
    confidence: 0.8,
  },
];

export const injectionAnalyzer: Analyzer = {
  name: "injection",

  async analyze(context: DiffContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const rawLine of context.diff.split("\n")) {
      if (!rawLine.startsWith("+") || rawLine.startsWith("+++")) continue;
      const file = extractFileFromLine(context.diff, rawLine);
      if (!file) continue;

      const line = rawLine.slice(1);

      for (const rule of INJECTION_PATTERNS) {
        if (!rule.regex.test(line)) continue;

        findings.push({
          id: stableFindingId("inj", rule.title, file, line.trim()),
          severity: rule.severity,
          category: "injection",
          title: rule.title,
          reason: rule.reason,
          evidence: [{ file, snippet: line.trim() }],
          suggestedAction: rule.action,
          confidence: rule.confidence,
          repro: `git diff ${context.base}...${context.head} -- ${file}`,
        });
      }
    }

    return findings;
  },
};

function extractFileFromLine(diff: string, targetLine: string): string | null {
  const lines = diff.split("\n");
  const targetIndex = lines.indexOf(targetLine);
  if (targetIndex === -1) return null;

  for (let i = targetIndex; i >= 0; i--) {
    if (lines[i].startsWith("+++ b/")) {
      return lines[i].slice(6);
    }
  }
  return null;
}
