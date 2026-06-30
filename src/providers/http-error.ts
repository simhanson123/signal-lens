import type { AiProviderError } from "./types.js";

export function httpError(status: number): AiProviderError {
  if (status >= 500) {
    return { status, message: `Provider server error (status ${status}) — try again later` };
  }
  const messages: Record<number, string> = {
    401: "Authentication failed — check your API key",
    403: "Access forbidden — check API key permissions",
    404: "Model not found — check the model name in your config",
    429: "Rate limit exceeded — consider reducing perspectives or retrying later",
  };
  return { status, message: messages[status] ?? `Provider returned HTTP ${status}` };
}

export const NETWORK_ERROR: AiProviderError = {
  status: "network",
  message: "Network error — check connectivity to the provider endpoint",
};

export const PARSE_ERROR: AiProviderError = {
  status: "parse",
  message: "Provider response could not be parsed — the model may have returned invalid JSON",
};
