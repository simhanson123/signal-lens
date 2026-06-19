import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Webhooks } from "@octokit/webhooks";
import { executeSlashCommand, parseSlashCommand } from "./slash-commands.js";
import { createOctokit } from "./client.js";

export interface GitHubAppOptions {
  repoRoot: string;
  port?: number;
  webhookSecret?: string;
  appId?: string;
  privateKey?: string;
}

export async function startGitHubAppServer(options: GitHubAppOptions): Promise<void> {
  const port = options.port ?? 3000;
  const secret = options.webhookSecret ?? process.env.GITHUB_WEBHOOK_SECRET ?? "dev-secret";
  const webhooks = new Webhooks({ secret });

  webhooks.on("issue_comment.created", async ({ payload }) => {
    if (!payload.issue.pull_request) return;

    const parsed = parseSlashCommand(payload.comment.body ?? "");
    if (!parsed) return;

    const [owner, repo] = payload.repository.full_name.split("/");
    const octokit = createOctokit(process.env.GITHUB_TOKEN);
    if (!octokit) return;

    const response = await executeSlashCommand({
      command: parsed.command,
      args: parsed.args,
      repoRoot: options.repoRoot,
      prNumber: payload.issue.number,
    });

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: payload.issue.number,
      body: response.message,
    });
  });

  webhooks.on("pull_request.opened", async ({ payload }) => {
    const octokit = createOctokit(process.env.GITHUB_TOKEN);
    if (!octokit) return;

    const [owner, repo] = payload.repository.full_name.split("/");
    await executeSlashCommand({
      command: "review",
      args: "",
      repoRoot: options.repoRoot,
      prNumber: payload.pull_request.number,
      base: payload.pull_request.base.sha,
      head: payload.pull_request.head.sha,
    });

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: payload.pull_request.number,
      body: "signal-lens: automatic review triggered. Reply with `/signal-lens explain` for details.",
    });
  });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "signal-lens-app" }));
      return;
    }

    if (req.method === "POST" && req.url === "/webhook") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks).toString("utf-8");
      const signature = req.headers["x-hub-signature-256"] as string;
      const id = req.headers["x-github-delivery"] as string;
      const name = req.headers["x-github-event"] as string;

      try {
        await webhooks.verifyAndReceive({ id, name, signature, payload: body });
        res.writeHead(200).end("ok");
      } catch (err) {
        res.writeHead(400).end(String(err));
      }
      return;
    }

    res.writeHead(404).end("not found");
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`signal-lens GitHub App webhook server listening on :${port}`);
}