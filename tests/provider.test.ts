import { describe, expect, it, afterEach, vi } from "vitest";
import { OpenAiProvider } from "../src/providers/openai.js";
import { AnthropicProvider } from "../src/providers/anthropic.js";
import { listProviders } from "../src/providers/registry.js";

const originalFetch = global.fetch;

function mockContext() {
  return {
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
  };
}

describe("OpenAiProvider", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
    global.fetch = originalFetch;
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
    const response = await provider.review(mockContext());

    expect(response.skipped).toBe(true);
    expect(response.findings).toHaveLength(0);
  });

  it("surfaces HTTP 401 as provider error", async () => {
    process.env.OPENAI_API_KEY = "fake-key";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    const provider = new OpenAiProvider();
    const response = await provider.review(mockContext());

    expect(response.error).toBeDefined();
    expect(response.error?.status).toBe(401);
    expect(response.error?.message).toContain("API key");
  });

  it("surfaces HTTP 429 as provider error", async () => {
    process.env.OPENAI_API_KEY = "fake-key";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    const provider = new OpenAiProvider();
    const response = await provider.review(mockContext());

    expect(response.error?.status).toBe(429);
    expect(response.error?.message).toContain("Rate limit");
  });

  it("surfaces network errors", async () => {
    process.env.OPENAI_API_KEY = "fake-key";
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const provider = new OpenAiProvider();
    const response = await provider.review(mockContext());

    expect(response.error?.status).toBe("network");
  });

  it("lists providers via registry", () => {
    const providers = listProviders();
    expect(providers.some((p) => p.name === "openai")).toBe(true);
    expect(providers.some((p) => p.name === "anthropic")).toBe(true);
    expect(providers.some((p) => p.name === "ollama")).toBe(true);
  });
});

describe("AnthropicProvider model selection", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalModel = process.env.ANTHROPIC_MODEL;

  afterEach(() => {
    if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
    else delete process.env.ANTHROPIC_API_KEY;
    if (originalModel) process.env.ANTHROPIC_MODEL = originalModel;
    else delete process.env.ANTHROPIC_MODEL;
    global.fetch = originalFetch;
  });

  it("honors request.model over env and default", async () => {
    process.env.ANTHROPIC_API_KEY = "fake-key";
    process.env.ANTHROPIC_MODEL = "claude-from-env";

    let capturedBody: Record<string, unknown> | undefined;
    global.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return { ok: true, status: 200, json: async () => ({ content: [{ text: "[]" }] }) };
    });

    const provider = new AnthropicProvider();
    await provider.review({ ...mockContext(), model: "claude-sonnet-4-test" });

    expect(capturedBody?.model).toBe("claude-sonnet-4-test");
  });

  it("surfaces HTTP 429 as provider error", async () => {
    process.env.ANTHROPIC_API_KEY = "fake-key";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    const provider = new AnthropicProvider();
    const response = await provider.review(mockContext());

    expect(response.error?.status).toBe(429);
  });
});