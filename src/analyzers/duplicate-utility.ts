import { execSync } from "node:child_process";
import { loadIndexedSymbols } from "../indexer/tree-sitter.js";
import { extractDiffSymbols, type DiffSymbol } from "../core/diff-symbols.js";
import type { Analyzer, DiffContext, Finding } from "../core/types.js";

export const duplicateUtilityAnalyzer: Analyzer = {
  name: "duplicate-utility",

  async analyze(context: DiffContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const newSymbols = extractDiffSymbols(context.diff);
    const indexed = loadIndexedSymbols(context.repoRoot);

    for (const symbol of newSymbols) {
      const sameName = indexed.filter(
        (s) => s.name === symbol.name && s.file !== symbol.file
      );

      if (sameName.length > 0) {
        findings.push({
          id: `dup-exact-${symbol.name}`,
          severity: "medium",
          category: "duplicate-utility",
          title: `Symbol "${symbol.name}" already exists elsewhere`,
          reason: "Tree-sitter index found an existing symbol with the same name.",
          evidence: sameName.map((s) => ({ file: s.file, line: s.line, symbol: s.name })),
          suggestedAction: `Reuse existing "${symbol.name}" instead of duplicating.`,
          confidence: 0.92,
          repro: `signal-lens index && git grep -n "${symbol.name}"`,
        });
        continue;
      }

      const similarName = indexed.filter((s) => {
        if (s.file === symbol.file) return false;
        return nameSimilarity(symbol.name, s.name) >= 0.65;
      });

      if (similarName.length > 0) {
        const top = similarName[0];
        findings.push({
          id: `dup-similar-${symbol.name}`,
          severity: "low",
          category: "duplicate-utility",
          title: `New "${symbol.name}" may duplicate "${top.name}"`,
          reason: "Symbol index suggests a similar utility already exists in the repository.",
          evidence: [
            { file: symbol.file, symbol: symbol.name, snippet: symbol.line },
            { file: top.file, line: top.line, symbol: top.name },
          ],
          suggestedAction: `Consider reusing or extending "${top.name}".`,
          confidence: 0.75,
        });
      }
    }

    if (indexed.length === 0) {
      findings.push(...legacyGrepAnalysis(context, newSymbols));
    }

    return findings;
  },
};

function nameSimilarity(a: string, b: string): number {
  const ta = new Set(a.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/));
  const tb = new Set(b.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size, 1);
}

function legacyGrepAnalysis(
  context: DiffContext,
  newSymbols: DiffSymbol[]
): Finding[] {
  const findings: Finding[] = [];
  for (const symbol of newSymbols) {
    try {
      const output = execSync(`git grep -n "${symbol.name}"`, {
        cwd: context.repoRoot,
        encoding: "utf-8",
      }).trim();

      const matches = output
        .split("\n")
        .filter(Boolean)
        .filter((l) => !l.startsWith(`${symbol.file}:`))
        .filter((l) => l.includes(symbol.name));

      if (matches.length > 0) {
        findings.push({
          id: `dup-grep-${symbol.name}`,
          severity: "medium",
          category: "duplicate-utility",
          title: `Symbol "${symbol.name}" found via git grep`,
          reason: "Fallback grep detected existing references (run `signal-lens index` for tree-sitter accuracy).",
          evidence: matches.slice(0, 3).map((l) => {
            const colon = l.indexOf(":");
            const file = l.slice(0, colon);
            const rest = l.slice(colon + 1);
            const line = Number(rest.split(":")[0]);
            return { file, line, symbol: symbol.name };
          }),
          suggestedAction: `Reuse "${symbol.name}" from existing codebase.`,
          confidence: 0.8,
        });
      }
    } catch {
      // no matches
    }
  }
  return findings;
}