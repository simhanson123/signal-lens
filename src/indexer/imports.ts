import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDatabase } from "../memory/database.js";

const IMPORT_PATTERNS = [
  /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
  /import\s+['"]([^'"]+)['"]/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /^import\s+(\S+)/gm,
  /^from\s+(\S+)\s+import/gm,
  /^import\s+"([^"]+)"/gm,
  /^use\s+([\w:]+)/gm,
  /^import\s+([\w.]+);/gm,
];

export function extractImports(filePath: string, repoRoot: string): string[] {
  try {
    const content = readFileSync(resolve(repoRoot, filePath), "utf-8");
    const imports = new Set<string>();

    for (const pattern of IMPORT_PATTERNS) {
      for (const match of content.matchAll(pattern)) {
        if (match[1]) imports.add(match[1]);
      }
    }

    return [...imports];
  } catch {
    return [];
  }
}

export function buildImportGraph(repoRoot: string, files: string[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const db = getDatabase(repoRoot);
  const insert = db.prepare(
    `INSERT OR REPLACE INTO import_edges (from_file, to_module) VALUES (?, ?)`
  );

  for (const file of files) {
    const imports = extractImports(file, repoRoot);
    graph.set(file, imports);
    for (const mod of imports) {
      insert.run(file, mod);
    }
  }

  return graph;
}

export function loadImportGraph(repoRoot: string): Map<string, string[]> {
  const db = getDatabase(repoRoot);
  const rows = db
    .prepare("SELECT from_file, to_module FROM import_edges")
    .all() as Array<{ from_file: string; to_module: string }>;

  const graph = new Map<string, string[]>();
  for (const row of rows) {
    const list = graph.get(row.from_file) ?? [];
    list.push(row.to_module);
    graph.set(row.from_file, list);
  }
  return graph;
}