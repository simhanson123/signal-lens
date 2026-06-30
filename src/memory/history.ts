import { getDatabase } from "./database.js";
import type { ReviewResult } from "../core/types.js";

export interface ReviewHistoryEntry {
  id: string;
  baseRef: string;
  headRef: string;
  findingCount: number;
  blockerCount: number;
  result: ReviewResult;
  createdAt: string;
}

export function saveReviewHistory(repoRoot: string, result: ReviewResult): ReviewHistoryEntry {
  const db = getDatabase(repoRoot);
  const entry: ReviewHistoryEntry = {
    id: `rh-${Date.now()}`,
    baseRef: result.base,
    headRef: result.head,
    findingCount: result.findings.length,
    blockerCount: result.findings.filter((f) => f.severity === "blocker").length,
    result,
    createdAt: result.generatedAt,
  };

  db.prepare(
    `INSERT INTO review_history (id, base_ref, head_ref, finding_count, blocker_count, result_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.id,
    entry.baseRef,
    entry.headRef,
    entry.findingCount,
    entry.blockerCount,
    JSON.stringify(result),
    entry.createdAt
  );

  return entry;
}

export function loadReviewHistory(repoRoot: string, limit = 20): ReviewHistoryEntry[] {
  const db = getDatabase(repoRoot);
  const rows = db
    .prepare(
      `SELECT id, base_ref, head_ref, finding_count, blocker_count, result_json, created_at
       FROM review_history ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as Array<{
    id: string;
    base_ref: string;
    head_ref: string;
    finding_count: number;
    blocker_count: number;
    result_json: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    baseRef: r.base_ref,
    headRef: r.head_ref,
    findingCount: r.finding_count,
    blockerCount: r.blocker_count,
    result: JSON.parse(r.result_json) as ReviewResult,
    createdAt: r.created_at,
  }));
}

export function getLastReviewHead(repoRoot: string, baseRef: string): string | null {
  const history = loadReviewHistory(repoRoot, 20);
  const match = history.find((h) => h.baseRef === baseRef);
  return match?.headRef ?? null;
}