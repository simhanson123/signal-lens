import type { ReviewResult } from "../core/types.js";

export type WebhookProvider = "slack" | "discord";

export function detectProvider(url: string): WebhookProvider {
  if (url.includes("hooks.slack.com")) return "slack";
  if (url.includes("discord.com/api/webhooks")) return "discord";
  return "slack";
}

function riskLevel(result: ReviewResult): { emoji: string; label: string; color: number } {
  const hasBlocker = result.findings.some((f) => f.severity === "blocker");
  const hasHigh = result.findings.some((f) => f.severity === "high");

  if (hasBlocker) return { emoji: "🔴", label: "Blocker findings detected", color: 0xe74c3c };
  if (hasHigh) return { emoji: "🟠", label: "High-risk findings detected", color: 0xe67e22 };
  if (result.findings.length > 0) return { emoji: "🟡", label: "Findings detected", color: 0xf1c40f };
  return { emoji: "🟢", label: "Clean review", color: 0x2ecc71 };
}

function topFindings(result: ReviewResult, max = 5): string[] {
  const priority = { blocker: 0, high: 1, medium: 2, low: 3 };
  return [...result.findings]
    .sort((a, b) => priority[a.severity] - priority[b.severity])
    .slice(0, max)
    .map((f) => `[${f.severity.toUpperCase()}] ${f.title}`);
}

function buildHeader(result: ReviewResult): string {
  const parts: string[] = [];
  if (result.pr?.title) parts.push(`*PR:* ${result.pr.title}`);
  if (result.changedFiles?.length) parts.push(`*Files:* ${result.changedFiles.length} changed`);
  parts.push(`*Findings:* ${result.findings.length}`);
  return parts.join("\n");
}

export function formatSlackMessage(result: ReviewResult): Record<string, unknown> {
  const risk = riskLevel(result);
  const headerText = `Signal Lens: ${risk.emoji} ${risk.label}`;

  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: headerText } },
  ];

  const contextText = buildHeader(result);
  if (contextText) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: contextText } });
  }

  const top = topFindings(result);
  if (top.length > 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: top.map((t) => `• ${t}`).join("\n") },
    });
  }

  return { blocks };
}

export function formatDiscordMessage(result: ReviewResult): Record<string, unknown> {
  const risk = riskLevel(result);
  const fields: Array<{ name: string; value: string }> = [];

  const top = topFindings(result);
  if (top.length > 0) {
    fields.push({ name: "Top findings", value: top.map((t) => `• ${t}`).join("\n") });
  }

  const description = buildHeader(result).replace(/\*/g, "**");

  return {
    embeds: [
      {
        title: `Signal Lens: ${risk.emoji} ${risk.label}`,
        description: description || undefined,
        color: risk.color,
        fields: fields.length > 0 ? fields : undefined,
        footer: { text: `Signal Lens v${result.version}` },
      },
    ],
  };
}

export async function sendNotification(
  webhookUrl: string,
  result: ReviewResult
): Promise<void> {
  const provider = detectProvider(webhookUrl);
  const body =
    provider === "slack" ? formatSlackMessage(result) : formatDiscordMessage(result);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: HTTP ${response.status}`);
  }
}

export function shouldNotify(result: ReviewResult): boolean {
  return result.findings.some((f) => f.severity === "blocker" || f.severity === "high");
}
