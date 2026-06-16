import { AnthropicProvider } from "./anthropic.js";
import { MockProvider } from "./mock.js";
import { OpenAiProvider } from "./openai.js";
import type { AiProvider } from "./types.js";

const providers: AiProvider[] = [
  new OpenAiProvider(),
  new AnthropicProvider(),
  new MockProvider(),
];

export function getProvider(name?: string): AiProvider {
  const selected = name ?? process.env.REVIEW_MCP_PROVIDER ?? "openai";

  const found = providers.find((p) => p.name === selected);
  if (found) return found;

  return providers[0];
}

export function getAvailableProvider(preferred?: string): AiProvider | null {
  if (preferred) {
    const p = getProvider(preferred);
    if (p.isAvailable()) return p;
  }

  for (const p of providers) {
    if (p.isAvailable()) return p;
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