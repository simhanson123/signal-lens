import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { DEFAULT_CONFIG, type ReviewMcpConfig } from "./schema.js";

export function loadConfig(repoRoot: string): ReviewMcpConfig {
  const configPath = resolve(repoRoot, ".review-mcp.yml");

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = parseYaml(readFileSync(configPath, "utf-8")) as Partial<ReviewMcpConfig>;
  return mergeConfig(DEFAULT_CONFIG, raw);
}

function mergeConfig(
  base: ReviewMcpConfig,
  override: Partial<ReviewMcpConfig>
): ReviewMcpConfig {
  return {
    version: override.version ?? base.version,
    ai: { ...base.ai, ...override.ai },
    analyzers: { ...base.analyzers, ...override.analyzers },
    rules: {
      architecture: override.rules?.architecture ?? base.rules.architecture,
    },
    ignore: {
      paths: override.ignore?.paths ?? base.ignore.paths,
    },
  };
}

export function shouldRunAiReview(config: ReviewMcpConfig): boolean {
  if (!config.ai.enabled) return false;
  if (config.analyzers["ai-review"] === false) return false;
  if (config.analyzers["ai-review"] === "auto") return true;
  return config.analyzers["ai-review"] === true;
}