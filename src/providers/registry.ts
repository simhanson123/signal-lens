import { AnthropicProvider } from "./anthropic.js";
import { MockProvider } from "./mock.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAiProvider } from "./openai.js";
import type { AiProvider } from "./types.js";

const providers: AiProvider[] = [
  new OpenAiProvider(),
  new AnthropicProvider(),
  new OllamaProvider(),
  new MockProvider(),
];

const AUTO_ORDER = ["openai", "anthropic", "ollama", "mock"];

export function getProvider(name: string): AiProvider {
  return providers.find((p) => p.name === name) ?? providers[0];
}

export function getAvailableProvider(
  preferred?: string,
  configProvider: string = "auto"
): AiProvider | null {
  const pref =
    preferred ??
    process.env.SIGNAL_LENS_PROVIDER ??
    process.env.REVIEW_MCP_PROVIDER ??
    configProvider;

  if (pref !== "auto") {
    const p = getProvider(pref);
    if (p.isAvailable()) return p;
    if (pref === "ollama") return p; // reachability checked at review time
    return null;
  }

  for (const name of AUTO_ORDER) {
    const p = getProvider(name);
    if (name === "ollama" || p.isAvailable()) return p;
  }
  return null;
}

export function listProviders(): Array<{ name: string; available: boolean; reason: string }> {
  return providers.map((p) => ({
    name: p.name,
    available: p.isAvailable(),
    reason: p.isAvailable() ? "ready" : p.unavailableReason(),
  }));
}