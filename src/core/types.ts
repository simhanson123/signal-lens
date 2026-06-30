export type Severity = "blocker" | "high" | "medium" | "low";

export type ChangeCategory =
  | "code"
  | "test"
  | "docs"
  | "ci"
  | "dependency"
  | "security-sensitive";

export interface Evidence {
  file: string;
  line?: number;
  symbol?: string;
  snippet?: string;
  relatedConfig?: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  reason: string;
  evidence: Evidence[];
  suggestedAction: string;
  confidence: number;
  repro?: string;
}

export interface ChangedFile {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  category: ChangeCategory;
  additions: number;
  deletions: number;
}

export interface DiffContext {
  base: string;
  head: string;
  repoRoot: string;
  changedFiles: ChangedFile[];
  diff: string;
  summary: string;
}

export interface PrContext {
  number?: number;
  title?: string;
  body?: string;
  author?: string;
  labels: string[];
  ciStatus?: "success" | "failure" | "pending" | "unknown";
  url?: string;
}

export interface ReviewSummary {
  purpose: string;
  scope: string;
  riskFiles: string[];
  categories: Record<ChangeCategory, number>;
  prTitle?: string;
  ciStatus?: string;
}

export type AiReviewStatus = "completed" | "skipped" | "disabled" | "error";

export interface ReviewResult {
  version: string;
  generatedAt: string;
  base: string;
  head: string;
  summary: ReviewSummary;
  findings: Finding[];
  changedFiles?: ChangedFile[];
  pr?: PrContext;
  metadata: {
    analyzerCount: number;
    durationMs: number;
    aiReview: AiReviewStatus;
    aiSkipReason?: string;
    staticOnly: boolean;
    provider?: string;
    repoContextUsed?: boolean;
    analyzerErrors?: Array<{ analyzer: string; error: string }>;
  };
}

export interface ReviewPrOptions {
  owner: string;
  repo: string;
  pullNumber: number;
  token?: string;
}

export interface ReviewOptions {
  base: string;
  head: string;
  repoRoot?: string;
  output?: "markdown" | "json" | "sarif" | "both" | "all" | "walkthrough";
  outputFile?: string;
  noAi?: boolean;
  pr?: ReviewPrOptions;
  incremental?: boolean;
}

export interface Analyzer {
  name: string;
  analyze(context: DiffContext): Promise<Finding[]>;
}