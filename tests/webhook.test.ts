import { describe, expect, it, vi, afterEach } from "vitest";
import {
  detectProvider,
  formatSlackMessage,
  formatDiscordMessage,
  sendNotification,
  shouldNotify,
} from "../src/notifications/webhook.js";
import type { ReviewResult } from "../src/core/types.js";

function makeResult(findings: ReviewResult["findings"]): ReviewResult {
  return {
    version: "2.2.0",
    generatedAt: "2026-07-01T00:00:00Z",
    base: "main",
    head: "HEAD",
    summary: { purpose: "", scope: "", riskFiles: [], categories: { code: 0, test: 0, docs: 0, ci: 0, dependency: 0, "security-sensitive": 0 } },
    findings,
  };
}

const originalFetch = global.fetch;

describe("detectProvider", () => {
  it("detects Slack URLs", () => {
    expect(detectProvider("https://hooks.slack.com/services/T000/B000/XXX")).toBe("slack");
  });

  it("detects Discord URLs", () => {
    expect(detectProvider("https://discord.com/api/webhooks/123/abc")).toBe("discord");
  });

  it("defaults to slack for unknown URLs", () => {
    expect(detectProvider("https://example.com/webhook")).toBe("slack");
  });
});

describe("formatSlackMessage", () => {
  it("includes blocker emoji for blocker findings", () => {
    const result = makeResult([
      { id: "1", severity: "blocker", category: "injection", title: "Critical issue", reason: "", evidence: [], suggestedAction: "", confidence: 0.9 },
    ]);
    const msg = formatSlackMessage(result) as { blocks: Array<{ type: string; text?: { text?: string } }> };
    const headerText = msg.blocks[0].text?.text ?? "";
    expect(headerText).toContain("🔴");
    expect(headerText).toContain("Blocker");
  });

  it("includes top finding titles", () => {
    const result = makeResult([
      { id: "1", severity: "high", category: "ci-weakening", title: "CI bypass", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
      { id: "2", severity: "low", category: "test-coverage", title: "Missing test", reason: "", evidence: [], suggestedAction: "", confidence: 0.6 },
    ]);
    const msg = formatSlackMessage(result) as { blocks: Array<{ text?: { text?: string } }> };
    const allText = msg.blocks.map((b) => b.text?.text ?? "").join("");
    expect(allText).toContain("CI bypass");
    expect(allText).toContain("Missing test");
  });

  it("shows clean message when no findings", () => {
    const result = makeResult([]);
    const msg = formatSlackMessage(result) as { blocks: Array<{ text?: { text?: string } }> };
    const headerText = msg.blocks[0].text?.text ?? "";
    expect(headerText).toContain("🟢");
    expect(headerText).toContain("Clean");
  });
});

describe("formatDiscordMessage", () => {
  it("produces embed with correct color for blocker", () => {
    const result = makeResult([
      { id: "1", severity: "blocker", category: "injection", title: "Critical", reason: "", evidence: [], suggestedAction: "", confidence: 0.9 },
    ]);
    const msg = formatDiscordMessage(result) as { embeds: Array<{ color: number; title: string }> };
    expect(msg.embeds[0].title).toContain("Blocker");
    expect(msg.embeds[0].color).toBe(0xe74c3c);
  });

  it("includes findings in fields", () => {
    const result = makeResult([
      { id: "1", severity: "high", category: "ci-weakening", title: "CI issue", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
    ]);
    const msg = formatDiscordMessage(result) as { embeds: Array<{ fields?: Array<{ value: string }> }> };
    expect(msg.embeds[0].fields?.[0].value).toContain("CI issue");
  });
});

describe("shouldNotify", () => {
  it("returns true for blocker findings", () => {
    expect(shouldNotify(makeResult([
      { id: "1", severity: "blocker", category: "x", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.9 },
    ]))).toBe(true);
  });

  it("returns true for high findings", () => {
    expect(shouldNotify(makeResult([
      { id: "1", severity: "high", category: "x", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.8 },
    ]))).toBe(true);
  });

  it("returns false for only low/medium findings", () => {
    expect(shouldNotify(makeResult([
      { id: "1", severity: "low", category: "x", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.5 },
    ]))).toBe(false);
  });

  it("returns false for no findings", () => {
    expect(shouldNotify(makeResult([]))).toBe(false);
  });
});

describe("sendNotification", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("POSTs to Slack webhook URL", async () => {
    let capturedUrl = "";
    let capturedBody: unknown;
    global.fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body as string);
      return { ok: true, status: 200 };
    });

    const result = makeResult([
      { id: "1", severity: "blocker", category: "x", title: "x", reason: "", evidence: [], suggestedAction: "", confidence: 0.9 },
    ]);
    await sendNotification("https://hooks.slack.com/services/T/B/X", result);

    expect(capturedUrl).toBe("https://hooks.slack.com/services/T/B/X");
    expect((capturedBody as { blocks: unknown[] }).blocks).toBeDefined();
  });

  it("throws on non-2xx response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      sendNotification("https://hooks.slack.com/services/T/B/X", makeResult([]))
    ).rejects.toThrow("HTTP 500");
  });
});
