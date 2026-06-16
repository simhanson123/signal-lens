import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface SymbolInfo {
  name: string;
  kind: "function" | "class" | "const" | "method";
  file: string;
  line: number;
  signature?: string;
}

const PATTERNS: Array<{ kind: SymbolInfo["kind"]; regex: RegExp }> = [
  { kind: "function", regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/ },
  { kind: "class", regex: /^(?:export\s+)?class\s+(\w+)/ },
  { kind: "const", regex: /^(?:export\s+)?const\s+(\w+)\s*=/ },
  { kind: "method", regex: /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/ },
  { kind: "function", regex: /^def\s+(\w+)\s*\(/ },
  { kind: "function", regex: /^func\s+(\w+)\s*\(/ },
];

export function extractSymbolsFromFile(filePath: string, repoRoot: string): SymbolInfo[] {
  const fullPath = resolve(repoRoot, filePath);
  const symbols: SymbolInfo[] = [];

  try {
    const content = readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { kind, regex } of PATTERNS) {
        const match = line.match(regex);
        if (match?.[1] && !isCommonKeyword(match[1])) {
          symbols.push({
            name: match[1],
            kind,
            file: filePath,
            line: i + 1,
            signature: line.trim().slice(0, 120),
          });
        }
      }
    }
  } catch {
    // unreadable file
  }

  return symbols;
}

export function indexRepository(
  repoRoot: string,
  extensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go"]
): SymbolInfo[] {
  const extArgs = extensions.map((e) => `"*${e}"`).join(" ");
  const symbols: SymbolInfo[] = [];

  try {
    const output = execSync(
      `git ls-files ${extArgs}`,
      { cwd: repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    if (!output) return symbols;

    for (const file of output.split("\n").filter(Boolean)) {
      symbols.push(...extractSymbolsFromFile(file, repoRoot));
    }
  } catch {
    // fallback: no indexed files
  }

  return symbols;
}

export function findSymbol(
  symbols: SymbolInfo[],
  name: string
): SymbolInfo[] {
  const lower = name.toLowerCase();
  return symbols.filter(
    (s) =>
      s.name === name ||
      s.name.toLowerCase() === lower ||
      s.name.toLowerCase().includes(lower) ||
      lower.includes(s.name.toLowerCase())
  );
}

function isCommonKeyword(name: string): boolean {
  return ["if", "for", "while", "switch", "catch", "constructor"].includes(name);
}