import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ciWeakeningAnalyzer } from "../src/analyzers/ci-weakening.js";
import { securityBoundaryAnalyzer } from "../src/analyzers/security-boundary.js";
import type { DiffContext } from "../src/core/types.js";

interface FixtureSnapshot {
  scenario: string;
  expectedFindings: Array<{
    category: string;
    severity: string;
    titleContains: string;
  }>;
  diff: string;
}

import { duplicateUtilityAnalyzer } from "../src/analyzers/duplicate-utility.js";
import { testCoverageAnalyzer } from "../src/analyzers/test-coverage.js";

const ANALYZERS: Record<string, typeof ciWeakeningAnalyzer> = {
  "ci-weakening": ciWeakeningAnalyzer,
  "security-boundary": securityBoundaryAnalyzer,
  "duplicate-utility": duplicateUtilityAnalyzer,
  "test-coverage": testCoverageAnalyzer,
};

function makeContext(diff: string, file: string): DiffContext {
  return {
    base: "main",
    head: "HEAD",
    repoRoot: process.cwd(),
    changedFiles: [
      {
        path: file,
        status: "modified",
        category: file.includes(".github") ? "ci" : "code",
        additions: 1,
        deletions: 0,
      },
    ],
    diff,
    summary: "fixture",
  };
}

function extractFileFromDiff(diff: string): string {
  const match = diff.match(/^\+\+\+ b\/(.+)$/m);
  return match?.[1] ?? ".github/workflows/ci.yml";
}

describe("fixture snapshots", () => {
  const snapshotDir = resolve(process.cwd(), "fixtures/snapshots");
  const files = readdirSync(snapshotDir).filter(
    (f) => f.endsWith(".json") && !f.includes(".review.")
  );

  for (const file of files) {
    const fixture = JSON.parse(
      readFileSync(resolve(snapshotDir, file), "utf-8")
    ) as FixtureSnapshot;

    const category = file.replace(".json", "");
    const analyzer = ANALYZERS[category === "ci-weakening" ? "ci-weakening" : category];

    if (!analyzer) continue;

    it(`detects: ${fixture.scenario}`, async () => {
      const changedFile = extractFileFromDiff(fixture.diff);
      const findings = await analyzer.analyze(
        makeContext(fixture.diff, changedFile)
      );

      for (const expected of fixture.expectedFindings) {
        const match = findings.find(
          (f) =>
            f.category === expected.category &&
            f.severity === expected.severity &&
            f.title.toLowerCase().includes(expected.titleContains.toLowerCase())
        );
        expect(match, `Expected finding containing "${expected.titleContains}"`).toBeDefined();
      }
    });
  }
});