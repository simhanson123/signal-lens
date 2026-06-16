import type { Analyzer, DiffContext, Finding } from "../core/types.js";

const TEST_PATTERNS = [
  /(^|\/)tests?\//i,
  /(^|\/)__tests__\//i,
  /\.test\.[jt]sx?$/i,
  /\.spec\.[jt]sx?$/i,
  /_test\.py$/i,
  /test_.*\.py$/i,
];

const CODE_PATTERNS = [
  /^src\//i,
  /^lib\//i,
  /^app\//i,
  /\.ts$/i,
  /\.py$/i,
  /\.go$/i,
];

function isTestFile(path: string): boolean {
  return TEST_PATTERNS.some((p) => p.test(path));
}

function isCodeFile(path: string): boolean {
  if (isTestFile(path)) return false;
  return CODE_PATTERNS.some((p) => p.test(path));
}

function extractAddedSymbols(diff: string): Array<{ name: string; file: string }> {
  const symbols: Array<{ name: string; file: string }> = [];
  let file = "";

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      file = line.slice(6);
      continue;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const content = line.slice(1);
    const match =
      content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/) ??
      content.match(/(?:export\s+)?const\s+(\w+)\s*=/) ??
      content.match(/def\s+(\w+)\s*\(/);
    if (match?.[1] && file && isCodeFile(file)) {
      symbols.push({ name: match[1], file });
    }
  }
  return symbols;
}

export const testCoverageAnalyzer: Analyzer = {
  name: "test-coverage",

  async analyze(context: DiffContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const codeChanges = context.changedFiles.filter((f) => isCodeFile(f.path));
    const testChanges = context.changedFiles.filter((f) => isTestFile(f.path));

    if (codeChanges.length > 0 && testChanges.length === 0) {
      findings.push({
        id: "test-missing-files",
        severity: "medium",
        category: "test-coverage",
        title: "Source changed without test file updates",
        reason:
          `${codeChanges.length} source file(s) changed but no test files were added or modified. Agent-generated PRs often skip tests.`,
        evidence: codeChanges.slice(0, 5).map((f) => ({ file: f.path })),
        suggestedAction: "Add or update tests covering the changed behavior.",
        confidence: 0.8,
        repro: `git diff ${context.base}...${context.head} -- ${codeChanges.map((f) => f.path).join(" ")}`,
      });
    }

    const newSymbols = extractAddedSymbols(context.diff);
    if (newSymbols.length > 0 && testChanges.length === 0) {
      for (const sym of newSymbols.slice(0, 5)) {
        findings.push({
          id: `test-missing-${sym.name}`,
          severity: "medium",
          category: "test-coverage",
          title: `New symbol "${sym.name}" has no corresponding test changes`,
          reason: "A new function or utility was added without test coverage in this PR.",
          evidence: [{ file: sym.file, symbol: sym.name }],
          suggestedAction: `Add unit tests for "${sym.name}".`,
          confidence: 0.75,
        });
      }
    }

    return findings;
  },
};