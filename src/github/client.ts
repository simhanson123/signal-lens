import { Octokit } from "@octokit/rest";

export function createOctokit(token?: string): Octokit | null {
  const auth = token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!auth) return null;
  return new Octokit({ auth });
}