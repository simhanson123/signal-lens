import type { Finding } from "../core/types.js";

const SEVERITY_ORDER = ["blocker", "high", "medium", "low"] as const;

export function synthesizeFindings(findings: Finding[]): Finding[] {
  const deduped = dedupeByKey(findings);
  return deduped.sort((a, b) => {
    const sd = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (sd !== 0) return sd;
    return b.confidence - a.confidence;
  });
}

function dedupeByKey(findings: Finding[]): Finding[] {
  const map = new Map<string, Finding>();

  for (const f of findings) {
    const key = `${f.category}:${f.title}:${f.evidence[0]?.file ?? ""}:${f.evidence[0]?.line ?? ""}`;
    const existing = map.get(key);
    if (!existing || f.confidence > existing.confidence) {
      map.set(key, f);
    }
  }

  return [...map.values()];
}

export function mergeRelatedComments(findings: Finding[]): Finding[] {
  const groups = new Map<string, Finding[]>();

  for (const f of findings) {
    const file = f.evidence[0]?.file ?? "global";
    const list = groups.get(file) ?? [];
    list.push(f);
    groups.set(file, list);
  }

  const merged: Finding[] = [];
  for (const [, group] of groups) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }

    const top = group[0];
    merged.push({
      ...top,
      reason: group.map((g) => `- ${g.title}: ${g.reason}`).join("\n"),
      confidence: Math.max(...group.map((g) => g.confidence)),
    });
  }

  return merged;
}