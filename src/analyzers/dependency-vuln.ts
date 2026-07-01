import { stableFindingId } from "../core/finding-id.js";
import type { Analyzer, DiffContext, Finding } from "../core/types.js";
import { parseAddedLines } from "../core/diff-lines.js";

const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const OSV_TIMEOUT = 10_000;

const DEP_FILES = new Set([
  "package.json",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
]);

interface ParsedDep {
  name: string;
  version: string;
  ecosystem: string;
  file: string;
  snippet: string;
  lineNumber: number;
}

interface OsvVuln {
  id: string;
  summary?: string;
  database_specific?: { severity?: string };
}

function parseDependencies(diff: string): ParsedDep[] {
  const deps: ParsedDep[] = [];
  const addedLines = parseAddedLines(diff);

  for (const { file, lineNumber, content } of addedLines) {
    const basename = file.split("/").pop() ?? file;

    if (basename === "package.json") {
      const m = content.match(/["']([\w@][\w@./-]*)["']\s*:\s*["']\^?([\d.]+)/);
      if (m) deps.push({ name: m[1], version: m[2], ecosystem: "npm", file, lineNumber, snippet: content.trim() });
    } else if (basename === "requirements.txt") {
      const m = content.match(/^([\w-]+)\s*[=<>~!]+\s*([\d.]+)/);
      if (m) deps.push({ name: m[1], version: m[2], ecosystem: "PyPI", file, lineNumber, snippet: content.trim() });
    } else if (basename === "go.mod") {
      const m = content.match(/^\s*(\S+)\s+v(\d[\d.]*)/);
      if (m && !m[1].startsWith("//")) deps.push({ name: m[1], version: m[2], ecosystem: "Go", file, lineNumber, snippet: content.trim() });
    } else if (basename === "Cargo.toml") {
      const m = content.match(/^(\w[\w-]*)\s*=\s*["']([\d.]+)/);
      if (m) deps.push({ name: m[1], version: m[2], ecosystem: "crates.io", file, lineNumber, snippet: content.trim() });
    }
  }

  return deps;
}

async function queryOsvBatch(deps: ParsedDep[]): Promise<Record<number, OsvVuln[]>> {
  const queries = deps.map((d) => ({
    package: { name: d.name, ecosystem: d.ecosystem },
    version: d.version,
  }));

  const response = await fetch(OSV_BATCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
    signal: AbortSignal.timeout(OSV_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(`OSV API returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as { results?: Array<{ vulns?: OsvVuln[] }> };
  const vulnMap: Record<number, OsvVuln[]> = {};

  const results = data.results ?? [];
  for (let i = 0; i < results.length; i++) {
    if (results[i]?.vulns && results[i]!.vulns!.length > 0) {
      vulnMap[i] = results[i]!.vulns!;
    }
  }

  return vulnMap;
}

function osvSeverityToSignal(severity?: string): Finding["severity"] {
  const s = (severity ?? "").toUpperCase();
  if (s === "CRITICAL") return "blocker";
  if (s === "HIGH") return "high";
  if (s === "MODERATE") return "medium";
  if (s === "LOW") return "low";
  return "high";
}

export const dependencyVulnAnalyzer: Analyzer = {
  name: "dependency-vuln",

  async analyze(context: DiffContext): Promise<Finding[]> {
    const deps = parseDependencies(context.diff);
    if (deps.length === 0) return [];

    const hasDepFile = context.changedFiles.some(
      (f) => DEP_FILES.has(f.path.split("/").pop() ?? f.path)
    );
    if (!hasDepFile) return [];

    let vulnMap: Record<number, OsvVuln[]>;
    try {
      vulnMap = await queryOsvBatch(deps);
    } catch {
      return [];
    }

    const findings: Finding[] = [];

    for (const [indexStr, vulns] of Object.entries(vulnMap)) {
      const index = Number(indexStr);
      const dep = deps[index];
      if (!dep) continue;

      const highestSeverity = vulns
        .map((v) => osvSeverityToSignal(v.database_specific?.severity))
        .sort((a, b) => severityRank(b) - severityRank(a))[0];

      const ids = vulns.map((v) => v.id).slice(0, 5).join(", ");
      const summaries = vulns
        .map((v) => v.summary ?? v.id)
        .slice(0, 3)
        .join("; ");

      findings.push({
        id: stableFindingId("dep-vuln", dep.name, dep.file, dep.version),
        severity: highestSeverity,
        category: "dependency-vuln",
        title: `Vulnerable dependency: ${dep.name}@${dep.version}`,
        reason: `${dep.name}@${dep.version} (${dep.ecosystem}) has ${vulns.length} known vulnerabilit${vulns.length === 1 ? "y" : "ies"}: ${ids}. ${summaries}`,
        evidence: [{ file: dep.file, line: dep.lineNumber, snippet: dep.snippet, relatedConfig: dep.ecosystem }],
        suggestedAction: `Upgrade ${dep.name} to a version without known vulnerabilities. See https://osv.dev/list?q=${encodeURIComponent(dep.name)} for details.`,
        confidence: 0.9,
      });
    }

    return findings;
  },
};

function severityRank(s: Finding["severity"]): number {
  const rank = { blocker: 4, high: 3, medium: 2, low: 1 };
  return rank[s];
}
