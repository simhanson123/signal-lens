import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../src/memory/database.js";
import { runReview } from "../src/orchestrator/review.js";

const STORE = resolve(process.cwd(), ".review-mcp");

afterEach(() => {
  resetDatabase();
  if (existsSync(STORE)) rmSync(STORE, { recursive: true, force: true });
});

describe("runReview integration", () => {
  it("runs static review on current repo", async () => {
    // git diff + multiple analyzers can be slow on Windows
    const result = await runReview({
      base: "HEAD~1",
      head: "HEAD",
      repoRoot: process.cwd(),
      noAi: true,
    });

    expect(result.version).toBe("1.3.0");
    expect(result.metadata.staticOnly).toBe(true);
    expect(result.metadata.analyzerCount).toBeGreaterThan(0);
  }, 20_000);
});