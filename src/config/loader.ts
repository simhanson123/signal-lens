import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { DEFAULT_CONFIG, type SignalLensConfig } from "./schema.js";

function resolveConfigPath(repoRoot: string): string | null {
  const primary = resolve(repoRoot, ".signal-lens.yml");
  if (existsSync(primary)) return primary;

  const legacy = resolve(repoRoot, ".review-mcp.yml");
  if (existsSync(legacy)) return legacy;

  return null;
}

export function loadConfig(repoRoot: string): SignalLensConfig {
  const configPath = resolveConfigPath(repoRoot);

  if (!configPath) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = parseYaml(readFileSync(configPath, "utf-8")) as Partial<SignalLensConfig>;
  return mergeConfig(DEFAULT_CONFIG, raw);
}

function mergeConfig(
  base: SignalLensConfig,
  override: Partial<SignalLensConfig>
): SignalLensConfig {
  return {
    version: override.version ?? base.version,
    ai: {
      ...base.ai,
      ...override.ai,
      ollama: {
        baseUrl: override.ai?.ollama?.baseUrl ?? base.ai.ollama?.baseUrl ?? "http://localhost:11434",
      },
    },
    analyzers: { ...base.analyzers, ...override.analyzers },
    rules: {
      architecture: override.rules?.architecture ?? base.rules.architecture,
    },
    ignore: {
      paths: override.ignore?.paths ?? base.ignore.paths,
    },
  };
}

export function shouldRunAiReview(config: SignalLensConfig): boolean {
  if (!config.ai.enabled) return false;
  if (config.analyzers["ai-review"] === false) return false;
  if (config.analyzers["ai-review"] === "auto") return true;
  return config.analyzers["ai-review"] === true;
}