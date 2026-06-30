export interface DiffSymbol {
  name: string;
  file: string;
  line: string;
}

const SYMBOL_PATTERNS = [
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
  /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/,
  /^(?:export\s+)?class\s+(\w+)/,
  /^def\s+(\w+)\s*\(/,
  /^func\s+(\w+)\s*\(/,
  /^(?:pub\s+)?fn\s+(\w+)\s*[(<]/,
];

export function extractDiffSymbols(diff: string): DiffSymbol[] {
  const symbols: DiffSymbol[] = [];
  let currentFile = "";

  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice(6);
      continue;
    }
    if (!rawLine.startsWith("+") || rawLine.startsWith("+++")) continue;
    const content = rawLine.slice(1);
    for (const pattern of SYMBOL_PATTERNS) {
      const match = content.match(pattern);
      if (match?.[1]) {
        symbols.push({ name: match[1], file: currentFile, line: content.trim() });
        break;
      }
    }
  }
  return symbols;
}
