import type { Finding, ReviewResult } from "./types.js";

const SEVERITY_MAP: Record<Finding["severity"], string> = {
  blocker: "error",
  high: "error",
  medium: "warning",
  low: "note",
};

export function toSarif(result: ReviewResult): string {
  const rules = buildRules(result.findings);
  const ruleIndex = new Map(rules.map((r, i) => [r.id, i]));

  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "signal-lens",
          version: result.version,
          informationUri: "https://github.com/simhanson123/signal-lens",
          rules,
        },
      },
      results: result.findings.map((finding) => ({
        ruleId: finding.category,
        ruleIndex: ruleIndex.get(finding.category) ?? 0,
        level: SEVERITY_MAP[finding.severity],
        message: { text: `${finding.title}: ${finding.reason}` },
        locations: finding.evidence.length
          ? finding.evidence.map((ev) => ({
              physicalLocation: {
                artifactLocation: { uri: ev.file },
                region: ev.line ? { startLine: ev.line } : undefined,
              },
            }))
          : [{ physicalLocation: { artifactLocation: { uri: "unknown" } } }],
        properties: {
          confidence: finding.confidence,
          suggestedAction: finding.suggestedAction,
          findingId: finding.id,
        },
      })),
    }],
  };

  return JSON.stringify(sarif, null, 2);
}

function buildRules(findings: Finding[]) {
  const seen = new Set<string>();
  return findings
    .filter((f) => {
      if (seen.has(f.category)) return false;
      seen.add(f.category);
      return true;
    })
    .map((f) => ({
      id: f.category,
      name: f.category,
      shortDescription: { text: f.title },
      fullDescription: { text: f.reason },
    }));
}