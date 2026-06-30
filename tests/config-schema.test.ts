import { describe, expect, it } from "vitest";
import { SignalLensConfigSchema, DEFAULT_CONFIG } from "../src/config/schema.js";

describe("config schema validation", () => {
  it("applies all defaults for an empty object", () => {
    const config = SignalLensConfigSchema.parse({});
    expect(config.ai.enabled).toBe(true);
    expect(config.ai.provider).toBe("auto");
    expect(config.ai.model).toBe("gpt-4o-mini");
    expect(config.ai.perspectives).toEqual(["security", "architecture", "correctness"]);
    expect(config.analyzers["ci-weakening"]).toBe(true);
    expect(config.analyzers["ai-review"]).toBe("auto");
    expect(config.rules.architecture).toEqual([]);
    expect(config.ignore.paths).toEqual(["node_modules/**", "dist/**", "coverage/**"]);
  });

  it("DEFAULT_CONFIG matches schema parse of empty object", () => {
    expect(DEFAULT_CONFIG).toEqual(SignalLensConfigSchema.parse({}));
  });

  it("throws on invalid boolean type", () => {
    expect(() => SignalLensConfigSchema.parse({ ai: { enabled: "yes" } })).toThrow();
  });

  it("throws on invalid provider enum", () => {
    expect(() => SignalLensConfigSchema.parse({ ai: { provider: "invalid-provider" } })).toThrow();
  });

  it("throws on non-array perspectives", () => {
    expect(() => SignalLensConfigSchema.parse({ ai: { perspectives: "security" } })).toThrow();
  });

  it("throws on invalid ai-review value", () => {
    expect(() => SignalLensConfigSchema.parse({ analyzers: { "ai-review": "always" } })).toThrow();
  });

  it("accepts partial nested overrides and fills the rest with defaults", () => {
    const config = SignalLensConfigSchema.parse({
      ai: { provider: "ollama" },
    });
    expect(config.ai.provider).toBe("ollama");
    expect(config.ai.enabled).toBe(true);
    expect(config.analyzers["ci-weakening"]).toBe(true);
  });

  it("accepts boolean false for ai-review", () => {
    const config = SignalLensConfigSchema.parse({ analyzers: { "ai-review": false } });
    expect(config.analyzers["ai-review"]).toBe(false);
  });
});
