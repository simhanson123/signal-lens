import { stableFindingId } from "../core/finding-id.js";
import type { Analyzer, DiffContext, Finding, Severity } from "../core/types.js";

export interface CustomRule {
  id: string;
  pattern: string;
  severity: Severity;
  message: string;
  paths?: string[];
  onAddedOnly?: boolean;
}

interface CompiledRule {
  id: string;
  regex: RegExp;
  severity: Severity;
  message: string;
  pathFilters?: RegExp[];
  onAddedOnly: boolean;
}

function globToRegex(pattern: string): RegExp {
  let regex = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        i++;
        if (pattern[i + 1] === "/") {
          i++;
          regex += "(?:.*/)?";
        } else {
          regex += ".*";
        }
      } else {
        regex += "[^/]*";
      }
    } else if (c === "?") {
      regex += ".";
    } else if (".+^$()|[]{}\\".includes(c)) {
      regex += "\\" + c;
    } else {
      regex += c;
    }
  }
  regex += "$";
  return new RegExp(regex);
}

export function createCustomRulesAnalyzer(rules: CustomRule[]): Analyzer {
  const compiled: CompiledRule[] = rules.map((r) => ({
    id: r.id,
    regex: new RegExp(r.pattern),
    severity: r.severity,
    message: r.message,
    pathFilters: r.paths?.map(globToRegex),
    onAddedOnly: r.onAddedOnly ?? true,
  }));

  return {
    name: "custom-rules",

    async analyze(context: DiffContext): Promise<Finding[]> {
      if (compiled.length === 0) return [];

      const findings: Finding[] = [];
      const addedLines = extractAddedLines(context.diff);

      for (const { file, line } of addedLines) {
        for (const rule of compiled) {
          if (rule.pathFilters && !rule.pathFilters.some((f) => f.test(file))) continue;
          if (!rule.regex.test(line)) continue;

          findings.push({
            id: stableFindingId(`custom-${rule.id}`, rule.message, file, line.trim()),
            severity: rule.severity,
            category: "custom-rule",
            title: rule.message,
            reason: `Custom rule "${rule.id}" matched (pattern: ${rule.regex.source})`,
            evidence: [{ file, snippet: line.trim() }],
            suggestedAction: `Fix the issue or adjust rule "${rule.id}" in .signal-lens.yml`,
            confidence: 0.9,
          });
        }
      }

      return findings;
    },
  };
}

function extractAddedLines(diff: string): Array<{ file: string; line: string }> {
  const results: Array<{ file: string; line: string }> = [];
  let currentFile = "";

  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice(6);
      continue;
    }
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      results.push({ file: currentFile, line: rawLine.slice(1) });
    }
  }

  return results;
}
