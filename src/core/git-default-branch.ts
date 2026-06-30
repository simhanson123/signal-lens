import { execSync } from "node:child_process";

export function detectDefaultBranch(repoRoot: string): string {
  try {
    const remote = execSync("git remote show origin", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const match = remote.match(/HEAD branch:\s*(\S+)/);
    if (match?.[1]) return match[1];
  } catch {
    // fall through to local detection
  }

  for (const branch of ["main", "master"]) {
    try {
      execSync(`git rev-parse --verify ${branch}`, {
        cwd: repoRoot,
        stdio: "ignore",
      });
      return branch;
    } catch {
      // try next candidate
    }
  }

  return "main";
}
