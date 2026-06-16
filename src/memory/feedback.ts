import { getDatabase } from "./database.js";

export interface FeedbackEntry {
  id: string;
  findingId: string;
  type: "false-positive" | "accepted" | "ignored-rule";
  reason?: string;
  recordedAt: string;
  recordedBy?: string;
}

export function loadFeedback(repoRoot: string): FeedbackEntry[] {
  const db = getDatabase(repoRoot);
  const rows = db
    .prepare("SELECT id, finding_id, type, reason, recorded_at, recorded_by FROM feedback ORDER BY recorded_at DESC")
    .all() as Array<{
    id: string;
    finding_id: string;
    type: FeedbackEntry["type"];
    reason: string | null;
    recorded_at: string;
    recorded_by: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    findingId: r.finding_id,
    type: r.type,
    reason: r.reason ?? undefined,
    recordedAt: r.recorded_at,
    recordedBy: r.recorded_by ?? undefined,
  }));
}

export function recordFeedback(
  repoRoot: string,
  entry: Omit<FeedbackEntry, "id" | "recordedAt">
): FeedbackEntry {
  const db = getDatabase(repoRoot);
  const full: FeedbackEntry = {
    ...entry,
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recordedAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO feedback (id, finding_id, type, reason, recorded_at, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(full.id, full.findingId, full.type, full.reason ?? null, full.recordedAt, full.recordedBy ?? null);

  return full;
}

export function filterByFeedback<T extends { id: string; category: string; title: string }>(
  findings: T[],
  repoRoot: string
): T[] {
  const entries = loadFeedback(repoRoot);
  const suppressed = new Set(
    entries
      .filter((e) => e.type === "false-positive" || e.type === "ignored-rule")
      .map((e) => e.findingId)
  );
  return findings.filter((f) => !suppressed.has(f.id));
}