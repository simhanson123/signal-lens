import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { OpenAiProvider } from "../src/providers/openai.js";
import { listProviders } from "../src/providers/registry.js";

describe("OpenAiProvider", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("is not available without API key", () => {
    delete process.env.OPENAI_API_KEY;
    const provider = new OpenAiProvider();
    expect(provider.isAvailable()).toBe(false);
    expect(provider.unavailableReason()).toContain("OPENAI_API_KEY");
  });

  it("skips review gracefully without API key", async () => {
    delete process.env.OPENAI_API_KEY;
    const provider = new OpenAiProvider();
    const response = await provider.review({
      context: {
        base: "main",
        head: "HEAD",
        repoRoot: process.cwd(),
        changedFiles: [],
        diff: "",
        summary: "",
      },
      perspectives: ["security"],
      model: "gpt-4o-mini",
      architectureRules: [],
    });

    expect(response.skipped).toBe(true);
    expect(response.findings).toHaveLength(0);
  });

  it("lists providers via registry", () => {
    const providers = listProviders();
    expect(providers.some((p) => p.name === "openai")).toBe(true);
    expect(providers.some((p) => p.name === "anthropic")).toBe(true);
    expect(providers.some((p) => p.name === "ollama")).toBe(true);
  });
});