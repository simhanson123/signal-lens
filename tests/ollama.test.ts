import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaProvider } from "../src/providers/ollama.js";

describe("OllamaProvider", () => {
  const originalProvider = process.env.SIGNAL_LENS_PROVIDER;
  const originalBase = process.env.OLLAMA_BASE_URL;

  beforeEach(() => {
    delete process.env.SIGNAL_LENS_PROVIDER;
    delete process.env.OLLAMA_BASE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalProvider) process.env.SIGNAL_LENS_PROVIDER = originalProvider;
    else delete process.env.SIGNAL_LENS_PROVIDER;
    if (originalBase) process.env.OLLAMA_BASE_URL = originalBase;
    else delete process.env.OLLAMA_BASE_URL;
  });

  it("is available by default", () => {
    const provider = new OllamaProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it("is not available when another provider is forced", () => {
    process.env.SIGNAL_LENS_PROVIDER = "openai";
    const provider = new OllamaProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it("skips review when Ollama is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connection refused"))
    );

    const provider = new OllamaProvider();
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
      model: "qwen2.5-coder:7b",
      architectureRules: [],
    });

    expect(response.skipped).toBe(true);
    expect(response.findings).toHaveLength(0);
    expect(response.skipReason).toContain("Ollama");
  });

  it("parses findings from Ollama chat response", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/api/tags")) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              findings: [
                {
                  severity: "high",
                  category: "security",
                  title: "Missing input validation",
                  reason: "User input passed to shell",
                  evidence: [{ file: "src/api.ts", line: 42 }],
                  suggestedAction: "Sanitize input",
                  confidence: 0.9,
                },
              ],
            }),
          },
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider();
    const response = await provider.review({
      context: {
        base: "main",
        head: "HEAD",
        repoRoot: process.cwd(),
        changedFiles: [{ path: "src/api.ts", status: "modified", category: "code", additions: 5, deletions: 0 }],
        diff: "+++ b/src/api.ts\n+exec(userInput)",
        summary: "",
      },
      perspectives: ["security"],
      model: "qwen2.5-coder:7b",
      architectureRules: [],
    });

    expect(response.skipped).toBe(false);
    expect(response.findings).toHaveLength(1);
    expect(response.findings[0].title).toBe("Missing input validation");
    expect(response.findings[0].evidence[0].line).toBe(42);
  });
});