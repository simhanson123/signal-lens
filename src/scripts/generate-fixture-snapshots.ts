import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ciWeakeningAnalyzer } from "../analyzers/ci-weakening.js";
import { duplicateUtilityAnalyzer } from "../analyzers/duplicate-utility.js";
import { securityBoundaryAnalyzer } from "../analyzers/security-boundary.js";
import { toMarkdown } from "../core/reporter.js";
import type { DiffContext, ReviewResult } from "../core/types.js";

interface FixtureSnapshot {
  scenario: string;
  diff: string;
}

const ANALYZERS: Record<string, typeof ciWeakeningAnalyzer> = {
  "ci-weakening": ciWeakeningAnalyzer,
  "duplicate-utility": duplicateUtilityAnalyzer,
  "security-boundary": securityBoundaryAnalyzer,
};

function extractFile(diff: string): string {
  const match = diff.match(/^\+\+\+ b\/(.+)$/m);
  return match?.[1] ?? ".github/workflows/ci.yml";
}

function makeContext(diff: string): DiffContext {
  const file = extractFile(diff);
  return {
    base: "main",
    head: "feature/fixture",
    repoRoot: process.cwd(),
    changedFiles: [
      {
        path: file,
        status: "modified",
        category: file.includes(".github") ? "ci" : "code",
        additions: 3,
        deletions: 0,
      },
    ],
    diff,
    summary: "fixture snapshot",
  };
}

async function main() {
  const dir = resolve("fixtures/snapshots");
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".json") && !f.includes(".review.")
  );

  for (const file of files) {
    const fixture = JSON.parse(readFileSync(resolve(dir, file), "utf-8")) as FixtureSnapshot;
    const key = file.replace(".json", "");
    const analyzer = ANALYZERS[key];
    if (!analyzer) continue;

    const context = makeContext(fixture.diff);
    const findings = await analyzer.analyze(context);

    const result: ReviewResult = {
      version: "0.2.0",
      generatedAt: new Date().toISOString(),
      base: context.base,
      head: context.head,
      summary: {
        purpose: fixture.scenario,
        scope: `Fixture: ${key}`,
        riskFiles: [context.changedFiles[0].path],
        categories: {
          code: key === "security-boundary" ? 1 : 0,
          test: 0,
          docs: 0,
          ci: key === "ci-weakening" ? 1 : 0,
          dependency: 0,
          "security-sensitive": 0,
        },
      },
      findings,
      metadata: {
        analyzerCount: 1,
        durationMs: 0,
        aiReview: "skipped",
        aiSkipReason: "Fixture snapshot — static analysis only",
        staticOnly: true,
      },
    };

    const baseName = file.replace(".json", "");
    writeFileSync(resolve(dir, `${baseName}.review.json`), JSON.stringify(result, null, 2));
    writeFileSync(resolve(dir, `${baseName}.review.md`), toMarkdown(result));
    console.log(`Generated ${baseName}.review.{json,md}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});