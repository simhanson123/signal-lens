import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface FeedbackEntry {
  id: string;
  findingId: string;
  type: "false-positive" | "accepted" | "ignored-rule";
  reason?: string;
  recordedAt: string;
  recordedBy?: string;
}

export interface FeedbackStore {
  version: number;
  entries: FeedbackEntry[];
}

const STORE_DIR = ".review-mcp";
const STORE_FILE = "feedback.json";

export function getStorePath(repoRoot: string): string {
  return resolve(repoRoot, STORE_DIR, STORE_FILE);
}

export function loadFeedback(repoRoot: string): FeedbackStore {
  const path = getStorePath(repoRoot);

  if (!existsSync(path)) {
    return { version: 1, entries: [] };
  }

  return JSON.parse(readFileSync(path, "utf-8")) as FeedbackStore;
}

export function saveFeedback(repoRoot: string, store: FeedbackStore): void {
  const dir = resolve(repoRoot, STORE_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getStorePath(repoRoot), JSON.stringify(store, null, 2));
}

export function recordFeedback(
  repoRoot: string,
  entry: Omit<FeedbackEntry, "id" | "recordedAt">
): FeedbackEntry {
  const store = loadFeedback(repoRoot);
  const full: FeedbackEntry = {
    ...entry,
    id: `fb-${Date.now()}`,
    recordedAt: new Date().toISOString(),
  };
  store.entries.push(full);
  saveFeedback(repoRoot, store);
  return full;
}

export function filterByFeedback(
  findings: Array<{ id: string; category: string; title: string }>,
  store: FeedbackStore
): typeof findings {
  const suppressed = new Set(
    store.entries
      .filter((e) => e.type === "false-positive" || e.type === "ignored-rule")
      .map((e) => e.findingId)
  );

  return findings.filter((f) => !suppressed.has(f.id));
}