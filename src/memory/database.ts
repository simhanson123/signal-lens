import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const STORE_DIR = ".review-mcp";

let dbInstance: Database.Database | null = null;

export function getDatabase(repoRoot: string): Database.Database {
  if (dbInstance) return dbInstance;

  const dir = resolve(repoRoot, STORE_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(resolve(dir, "review-mcp.sqlite"));
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      finding_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT,
      recorded_at TEXT NOT NULL,
      recorded_by TEXT
    );
    CREATE TABLE IF NOT EXISTS review_history (
      id TEXT PRIMARY KEY,
      base_ref TEXT NOT NULL,
      head_ref TEXT NOT NULL,
      finding_count INTEGER NOT NULL,
      blocker_count INTEGER NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS symbol_index (
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      file TEXT NOT NULL,
      line INTEGER NOT NULL,
      signature TEXT,
      body_hash TEXT,
      PRIMARY KEY (name, file, line)
    );
    CREATE TABLE IF NOT EXISTS import_edges (
      from_file TEXT NOT NULL,
      to_module TEXT NOT NULL,
      PRIMARY KEY (from_file, to_module)
    );
  `);

  dbInstance = db;
  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/** Reset DB connection (for tests). */
export function resetDatabase(): void {
  closeDatabase();
}