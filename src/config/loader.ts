import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { DEFAULT_CONFIG, SignalLensConfigSchema, type SignalLensConfig } from "./schema.js";

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

  const raw = parseYaml(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
  const merged = mergeConfig(DEFAULT_CONFIG, raw);

  const result = SignalLensConfigSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration in ${configPath}:\n${issues}`);
  }

  warnUnknownKeys(raw, configPath);

  return result.data;
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
      custom: override.rules?.custom ?? base.rules.custom,
    },
    ignore: {
      paths: override.ignore?.paths ?? base.ignore.paths,
    },
  };
}

const KNOWN_TOP_KEYS = new Set(["version", "ai", "analyzers", "rules", "ignore"]);
const KNOWN_AI_KEYS = new Set(["enabled", "provider", "model", "perspectives", "ollama"]);

function warnUnknownKeys(raw: Record<string, unknown>, configPath: string): void {
  for (const key of Object.keys(raw)) {
    if (!KNOWN_TOP_KEYS.has(key)) {
      console.warn(`[signal-lens] Warning: unknown key "${key}" in ${configPath} — it will be ignored.`);
    }
  }

  const ai = raw.ai as Record<string, unknown> | undefined;
  if (ai && typeof ai === "object") {
    for (const key of Object.keys(ai)) {
      if (!KNOWN_AI_KEYS.has(key)) {
        console.warn(`[signal-lens] Warning: unknown key "ai.${key}" in ${configPath} — it will be ignored.`);
      }
    }
  }
}

export function shouldRunAiReview(config: SignalLensConfig): boolean {
  if (!config.ai.enabled) return false;
  if (config.analyzers["ai-review"] === false) return false;
  if (config.analyzers["ai-review"] === "auto") return true;
  return config.analyzers["ai-review"] === true;
}
