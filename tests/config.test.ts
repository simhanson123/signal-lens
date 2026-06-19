import { describe, expect, it } from "vitest";
import { loadConfig, shouldRunAiReview } from "../src/config/loader.js";
import { DEFAULT_CONFIG } from "../src/config/schema.js";

describe("config", () => {
  it("loads default config when no file exists", () => {
    const config = loadConfig("/nonexistent/path");
    expect(config.version).toBe(DEFAULT_CONFIG.version);
    expect(config.analyzers["ci-weakening"]).toBe(true);
  });

  it("loads .signal-lens.yml from repo root", () => {
    const config = loadConfig(process.cwd());
    expect(config.rules.architecture.length).toBeGreaterThan(0);
  });

  it("shouldRunAiReview respects auto mode", () => {
    const config = loadConfig(process.cwd());
    expect(shouldRunAiReview(config)).toBe(true);
  });

  it("shouldRunAiReview returns false when disabled", () => {
    const config = loadConfig(process.cwd());
    config.ai.enabled = false;
    expect(shouldRunAiReview(config)).toBe(false);
  });
});