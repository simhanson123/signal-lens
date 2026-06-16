import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../src/memory/database.js";
import { filterByFeedback, loadFeedback, recordFeedback } from "../src/memory/feedback.js";

const STORE = resolve(process.cwd(), ".review-mcp");

afterEach(() => {
  resetDatabase();
  if (existsSync(STORE)) rmSync(STORE, { recursive: true, force: true });
});

describe("feedback memory (sqlite)", () => {
  it("records and loads false-positive entries", () => {
    recordFeedback(process.cwd(), {
      findingId: "ci-1",
      type: "false-positive",
      reason: "Intentional for flaky test",
    });

    const store = loadFeedback(process.cwd());
    expect(store).toHaveLength(1);
    expect(store[0].type).toBe("false-positive");
  });

  it("filters suppressed findings", () => {
    recordFeedback(process.cwd(), { findingId: "sec-1", type: "false-positive" });

    const filtered = filterByFeedback(
      [{ id: "sec-1", category: "security", title: "test" }],
      process.cwd()
    );
    expect(filtered).toHaveLength(0);
  });
});