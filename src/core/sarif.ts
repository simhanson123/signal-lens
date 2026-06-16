import type { Finding, ReviewResult } from "./types.js";

const SEVERITY_MAP: Record<Finding["severity"], string> = {
  blocker: "error",
  high: "error",
  medium: "warning",
  low: "note",
};

export function toSarif(result: ReviewResult): string {
  const sarif = {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "review-mcp",
            version: result.version,
            informationUri: "https://github.com/review-mcp/review-mcp",
            rules: buildRules(result.findings),
          },
        },
        results: result.findings.map((finding, index) => ({
          ruleId: finding.category,
          ruleIndex: index,
          level: SEVERITY_MAP[finding.severity],
          message: {
            text: `${finding.title}: ${finding.reason}`,
          },
          locations: finding.evidence.map((ev) => ({
            physicalLocation: {
              artifactLocation: { uri: ev.file },
              region: ev.line ? { startLine: ev.line } : undefined,
            },
          })),
          properties: {
            confidence: finding.confidence,
            suggestedAction: finding.suggestedAction,
            category: finding.category,
          },
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

function buildRules(findings: Finding[]) {
  const seen = new Set<string>();
  const rules: Array<{ id: string; name: string; shortDescription: { text: string } }> = [];

  for (const f of findings) {
    if (seen.has(f.category)) continue;
    seen.add(f.category);
    rules.push({
      id: f.category,
      name: f.category,
      shortDescription: { text: f.title },
    });
  }

  return rules;
}