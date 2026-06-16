import { execSync } from "node:child_process";
import type { Analyzer, DiffContext, Finding } from "../core/types.js";

const FUNCTION_PATTERNS = [
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
  /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/,
  /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?function/,
  /^def\s+(\w+)\s*\(/,
  /^func\s+(\w+)\s*\(/,
];

function extractNewSymbols(diff: string): Array<{ name: string; file: string; line: string }> {
  const symbols: Array<{ name: string; file: string; line: string }> = [];
  let currentFile = "";

  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice(6);
      continue;
    }

    if (!rawLine.startsWith("+") || rawLine.startsWith("+++")) continue;

    const line = rawLine.slice(1);
    for (const pattern of FUNCTION_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        symbols.push({ name: match[1], file: currentFile, line: line.trim() });
      }
    }
  }

  return symbols;
}

function searchExistingSymbol(
  repoRoot: string,
  symbolName: string,
  excludeFile: string
): string[] {
  try {
    const output = execSync(
      `git grep -n "\\b${symbolName}\\b" -- ':!${excludeFile}'`,
      { cwd: repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    return output ? output.split("\n").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function tokenize(name: string): Set<string> {
  return new Set(
    name
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2)
  );
}

function similarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  return intersection / Math.max(tokensA.size, tokensB.size);
}

function findSimilarSymbols(
  repoRoot: string,
  newName: string,
  excludeFile: string
): Array<{ name: string; location: string; score: number }> {
  const candidates: Array<{ name: string; location: string; score: number }> = [];

  try {
    const output = execSync(
      `git grep -n -E "(function|const|def|func)\\s+\\w+" -- "*.ts" "*.tsx" "*.js" "*.jsx" "*.py" "*.go"`,
      { cwd: repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    if (!output) return candidates;

    const seen = new Set<string>();

    for (const line of output.split("\n")) {
      const [location, ...rest] = line.split(":");
      const content = rest.join(":");
      const file = location.split(":")[0];

      if (file === excludeFile) continue;

      const match = content.match(
        /(?:function|const|def|func)\s+(\w+)/
      );
      if (!match?.[1]) continue;

      const existingName = match[1];
      if (existingName === newName || seen.has(existingName)) continue;

      const score = similarity(newName, existingName);
      if (score >= 0.6) {
        seen.add(existingName);
        candidates.push({ name: existingName, location, score });
      }
    }
  } catch {
    // No matches
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
}

export const duplicateUtilityAnalyzer: Analyzer = {
  name: "duplicate-utility",

  async analyze(context: DiffContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const newSymbols = extractNewSymbols(context.diff);

    for (const symbol of newSymbols) {
      const exactMatches = searchExistingSymbol(
        context.repoRoot,
        symbol.name,
        symbol.file
      );

      if (exactMatches.length > 0) {
        findings.push({
          id: `dup-exact-${symbol.name}`,
          severity: "medium",
          category: "duplicate-utility",
          title: `Symbol "${symbol.name}" already exists elsewhere`,
          reason:
            "A function or utility with the same name already exists in the repository. Agent-generated PRs often re-implement existing helpers.",
          evidence: exactMatches.map((m) => {
            const [file, line] = m.split(":");
            return { file, line: Number(line), symbol: symbol.name };
          }),
          suggestedAction: `Reuse existing "${symbol.name}" implementation instead of creating a duplicate.`,
          confidence: 0.9,
          repro: `git grep -n "${symbol.name}"`,
        });
        continue;
      }

      const similar = findSimilarSymbols(context.repoRoot, symbol.name, symbol.file);

      if (similar.length > 0) {
        const top = similar[0];
        findings.push({
          id: `dup-similar-${symbol.name}`,
          severity: "low",
          category: "duplicate-utility",
          title: `New "${symbol.name}" may duplicate existing "${top.name}"`,
          reason:
            "The new symbol name is similar to an existing utility, suggesting possible duplicate functionality.",
          evidence: [
            { file: symbol.file, symbol: symbol.name, snippet: symbol.line },
            {
              file: top.location.split(":")[0],
              symbol: top.name,
              snippet: `Similarity score: ${Math.round(top.score * 100)}%`,
            },
          ],
          suggestedAction: `Review whether "${top.name}" can be reused or extended instead of adding "${symbol.name}".`,
          confidence: top.score,
          repro: `git grep -n "${top.name}"`,
        });
      }
    }

    return findings;
  },
};