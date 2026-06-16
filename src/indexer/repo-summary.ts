import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReviewMcpConfig } from "../config/schema.js";
import { indexRepository, type SymbolInfo } from "./symbols.js";

export interface RepoSummary {
  root: string;
  languages: string[];
  packageManager?: string;
  testFramework?: string;
  symbolCount: number;
  topLevelDirs: string[];
  architectureRules: string[];
}

export function buildRepoSummary(
  repoRoot: string,
  config: ReviewMcpConfig
): RepoSummary {
  const languages = detectLanguages(repoRoot);

  return {
    root: repoRoot,
    languages,
    packageManager: detectPackageManager(repoRoot),
    testFramework: detectTestFramework(repoRoot),
    symbolCount: indexRepository(repoRoot).length,
    topLevelDirs: listTopLevelDirs(repoRoot),
    architectureRules: config.rules.architecture,
  };
}

export function getSymbolResource(
  repoRoot: string,
  name: string
): { name: string; matches: SymbolInfo[] } {
  const symbols = indexRepository(repoRoot);
  const matches = symbols.filter(
    (s) => s.name === name || s.name.toLowerCase().includes(name.toLowerCase())
  );

  return { name, matches: matches.slice(0, 20) };
}

function detectLanguages(repoRoot: string): string[] {
  const langs = new Set<string>();

  try {
    const output = execSync('git ls-files', {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();

    for (const file of output.split("\n")) {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) langs.add("typescript");
      else if (file.endsWith(".js") || file.endsWith(".jsx")) langs.add("javascript");
      else if (file.endsWith(".py")) langs.add("python");
      else if (file.endsWith(".go")) langs.add("go");
      else if (file.endsWith(".rs")) langs.add("rust");
    }
  } catch {
    // empty
  }

  return [...langs];
}

function detectPackageManager(repoRoot: string): string | undefined {
  if (existsSync(resolve(repoRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(resolve(repoRoot, "yarn.lock"))) return "yarn";
  if (existsSync(resolve(repoRoot, "package-lock.json"))) return "npm";
  if (existsSync(resolve(repoRoot, "pyproject.toml"))) return "pip/poetry";
  if (existsSync(resolve(repoRoot, "go.mod"))) return "go modules";
  return undefined;
}

function detectTestFramework(repoRoot: string): string | undefined {
  if (existsSync(resolve(repoRoot, "vitest.config.ts"))) return "vitest";
  if (existsSync(resolve(repoRoot, "jest.config.js"))) return "jest";
  if (existsSync(resolve(repoRoot, "pytest.ini"))) return "pytest";
  return undefined;
}

function listTopLevelDirs(repoRoot: string): string[] {
  try {
    const output = execSync('git ls-tree --name-only HEAD', {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();

    return output.split("\n").filter((e) => !e.includes("."));
  } catch {
    return [];
  }
}