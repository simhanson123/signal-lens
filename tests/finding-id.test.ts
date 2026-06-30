import { describe, expect, it } from "vitest";
import { stableFindingId } from "../src/core/finding-id.js";

describe("stableFindingId", () => {
  it("produces deterministic IDs for identical inputs", () => {
    const id1 = stableFindingId("ci", "CI step set to continue on error", ".github/workflows/ci.yml", "continue-on-error: true");
    const id2 = stableFindingId("ci", "CI step set to continue on error", ".github/workflows/ci.yml", "continue-on-error: true");
    expect(id1).toBe(id2);
  });

  it("produces different IDs for different snippets", () => {
    const id1 = stableFindingId("ci", "rule", "file.yml", "snippet-a");
    const id2 = stableFindingId("ci", "rule", "file.yml", "snippet-b");
    expect(id1).not.toBe(id2);
  });

  it("produces different IDs for different files", () => {
    const id1 = stableFindingId("sec", "rule", "file-a.ts", "snippet");
    const id2 = stableFindingId("sec", "rule", "file-b.ts", "snippet");
    expect(id1).not.toBe(id2);
  });

  it("produces different IDs for different prefixes", () => {
    const id1 = stableFindingId("ci", "rule", "file", "snippet");
    const id2 = stableFindingId("sec", "rule", "file", "snippet");
    expect(id1).not.toBe(id2);
  });

  it("remains stable regardless of call order or count", () => {
    const inputs = { prefix: "ci", title: "Test command removed", file: ".github/workflows/test.yml", snippet: "npm test" };
    const single = stableFindingId(inputs.prefix, inputs.title, inputs.file, inputs.snippet);

    const collected: string[] = [];
    for (let i = 0; i < 10; i++) {
      collected.push(stableFindingId(inputs.prefix, inputs.title, inputs.file, inputs.snippet));
    }
    expect(collected.every((id) => id === single)).toBe(true);
  });
});
