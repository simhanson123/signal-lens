import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Parser, Language, type Node } from "web-tree-sitter";
import { getDatabase } from "../memory/database.js";
import type { SymbolInfo } from "./symbols.js";

const EXT_TO_WASM: Record<string, string> = {
  ".ts": "tree-sitter-typescript.wasm",
  ".tsx": "tree-sitter-tsx.wasm",
  ".js": "tree-sitter-javascript.wasm",
  ".jsx": "tree-sitter-javascript.wasm",
  ".py": "tree-sitter-python.wasm",
  ".go": "tree-sitter-go.wasm",
  ".rs": "tree-sitter-rust.wasm",
  ".java": "tree-sitter-java.wasm",
};

const SYMBOL_NODE_TYPES = new Set([
  "function_declaration",
  "function_definition",
  "method_definition",
  "class_declaration",
  "lexical_declaration",
  "variable_declaration",
  "function_item",
]);

let parserReady = false;
const languageCache = new Map<string, Language>();
let sharedParser: Parser | null = null;

export async function initTreeSitter(): Promise<void> {
  if (parserReady) return;
  await Parser.init();
  sharedParser = new Parser();
  parserReady = true;
}

function wasmDir(): string {
  const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../node_modules/tree-sitter-wasms/out");
  return pkgRoot;
}

async function getLanguage(ext: string): Promise<Language | null> {
  const wasm = EXT_TO_WASM[ext];
  if (!wasm) return null;
  if (languageCache.has(wasm)) return languageCache.get(wasm)!;

  const lang = await Language.load(resolve(wasmDir(), wasm));
  languageCache.set(wasm, lang);
  return lang;
}

function extractFromNode(node: Node, file: string, symbols: SymbolInfo[]): void {
  if (SYMBOL_NODE_TYPES.has(node.type)) {
    const nameNode =
      node.childForFieldName("name") ??
      node.namedChildren.find((c) => c && (c.type === "identifier" || c.type === "property_identifier"));

    if (nameNode) {
      symbols.push({
        name: nameNode.text,
        kind: node.type.includes("class")
          ? "class"
          : node.type.includes("method")
            ? "method"
            : "function",
        file,
        line: node.startPosition.row + 1,
        signature: node.text.split("\n")[0]?.slice(0, 120),
        bodyHash: hashText(node.text),
      });
    }
  }

  for (const child of node.namedChildren) {
    if (child) extractFromNode(child, file, symbols);
  }
}

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h.toString(16);
}

export async function parseFileSymbols(filePath: string, repoRoot: string): Promise<SymbolInfo[]> {
  await initTreeSitter();
  if (!sharedParser) return [];

  const ext = filePath.slice(filePath.lastIndexOf("."));
  const lang = await getLanguage(ext);
  if (!lang) return [];

  sharedParser.setLanguage(lang);
  const content = readFileSync(resolve(repoRoot, filePath), "utf-8");
  const tree = sharedParser.parse(content);
  if (!tree) return [];
  const symbols: SymbolInfo[] = [];
  extractFromNode(tree.rootNode, filePath, symbols);
  return symbols;
}

export async function indexAndPersistSymbols(
  repoRoot: string,
  files: string[]
): Promise<SymbolInfo[]> {
  const db = getDatabase(repoRoot);
  const insert = db.prepare(
    `INSERT OR REPLACE INTO symbol_index (name, kind, file, line, signature, body_hash)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const all: SymbolInfo[] = [];
  for (const file of files) {
    const symbols = await parseFileSymbols(file, repoRoot);
    for (const s of symbols) {
      insert.run(s.name, s.kind, s.file, s.line, s.signature ?? null, s.bodyHash ?? null);
      all.push(s);
    }
  }
  return all;
}

export function loadIndexedSymbols(repoRoot: string): SymbolInfo[] {
  const db = getDatabase(repoRoot);
  const rows = db
    .prepare("SELECT name, kind, file, line, signature, body_hash FROM symbol_index")
    .all() as Array<{
    name: string;
    kind: string;
    file: string;
    line: number;
    signature: string | null;
    body_hash: string | null;
  }>;

  return rows.map((r) => ({
    name: r.name,
    kind: r.kind as SymbolInfo["kind"],
    file: r.file,
    line: r.line,
    signature: r.signature ?? undefined,
    bodyHash: r.body_hash ?? undefined,
  }));
}