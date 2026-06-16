import { describe, expect, it } from "vitest";
import { draftReleaseNotes } from "../src/release/assistant.js";

describe("release assistant", () => {
  it("drafts changelog from merged PRs", () => {
    const draft = draftReleaseNotes("0.2.0", [
      { number: 42, title: "Add MCP server", author: "dev", labels: [] },
      { number: 43, title: "BREAKING: rename CLI flags", author: "dev", labels: ["breaking"] },
    ]);

    expect(draft.changelog).toContain("0.2.0");
    expect(draft.changelog).toContain("#42");
    expect(draft.breakingChanges).toHaveLength(1);
    expect(draft.migrationNotes.length).toBeGreaterThan(0);
  });
});