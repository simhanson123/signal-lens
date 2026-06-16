import type { ChangeCategory, ChangedFile, DiffContext, ReviewSummary } from "./types.js";

const CI_PATTERNS = [
  /^\.github\/workflows\//,
  /(^|\/)jest\.config\./,
  /(^|\/)vitest\.config\./,
  /(^|\/)pytest\.ini$/,
  /(^|\/)\.eslintrc/,
  /(^|\/)eslint\.config\./,
  /(^|\/)coverage/,
  /(^|\/)codecov/,
  /(^|\/)sonar/,
];

const TEST_PATTERNS = [
  /(^|\/)test(s)?\//,
  /(^|\/)__tests__\//,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /_test\.py$/,
  /test_.*\.py$/,
];

const DOCS_PATTERNS = [
  /^docs\//,
  /^README/i,
  /\.md$/,
  /^CHANGELOG/i,
];

const DEPENDENCY_PATTERNS = [
  /^package\.json$/,
  /^package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /^requirements\.txt$/,
  /^pyproject\.toml$/,
  /^Cargo\.toml$/,
  /^go\.mod$/,
];

const SECURITY_PATTERNS = [
  /(^|\/)auth/,
  /(^|\/)permission/,
  /(^|\/)secret/,
  /(^|\/)token/,
  /(^|\/)crypto/,
  /(^|\/)security/,
  /(^|\/)middleware/,
  /(^|\/)guard/,
  /\.github\/workflows\//,
];

export function classifyFile(path: string): ChangeCategory {
  if (CI_PATTERNS.some((p) => p.test(path))) return "ci";
  if (DEPENDENCY_PATTERNS.some((p) => p.test(path))) return "dependency";
  if (TEST_PATTERNS.some((p) => p.test(path))) return "test";
  if (DOCS_PATTERNS.some((p) => p.test(path))) return "docs";
  if (SECURITY_PATTERNS.some((p) => p.test(path))) return "security-sensitive";
  return "code";
}

function emptyCategories(): Record<ChangeCategory, number> {
  return {
    code: 0,
    test: 0,
    docs: 0,
    ci: 0,
    dependency: 0,
    "security-sensitive": 0,
  };
}

export function buildReviewSummary(context: DiffContext): ReviewSummary {
  const categories = emptyCategories();

  for (const file of context.changedFiles) {
    categories[file.category]++;
  }

  const riskFiles = context.changedFiles
    .filter(
      (f) =>
        f.category === "ci" ||
        f.category === "security-sensitive" ||
        f.category === "dependency" ||
        (f.category === "code" && f.additions > 100)
    )
    .map((f) => f.path);

  const categoryLabels = Object.entries(categories)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(", ");

  return {
    purpose: inferPurpose(context),
    scope: `${context.summary} (${categoryLabels || "no categorized changes"})`,
    riskFiles,
    categories,
  };
}

function inferPurpose(context: DiffContext): string {
  const { changedFiles } = context;
  const hasCi = changedFiles.some((f) => f.category === "ci");
  const hasTests = changedFiles.some((f) => f.category === "test");
  const hasDeps = changedFiles.some((f) => f.category === "dependency");
  const hasSecurity = changedFiles.some((f) => f.category === "security-sensitive");

  const parts: string[] = [];
  if (hasCi) parts.push("CI/workflow changes");
  if (hasDeps) parts.push("dependency updates");
  if (hasSecurity) parts.push("security-sensitive area changes");
  if (hasTests) parts.push("test changes");
  if (changedFiles.some((f) => f.category === "code")) parts.push("application code changes");
  if (changedFiles.some((f) => f.category === "docs")) parts.push("documentation updates");

  return parts.length > 0 ? parts.join("; ") : "General repository changes";
}

export function getHighRiskFiles(files: ChangedFile[]): string[] {
  return files
    .filter(
      (f) =>
        f.category === "ci" ||
        f.category === "security-sensitive" ||
        f.category === "dependency"
    )
    .map((f) => f.path);
}