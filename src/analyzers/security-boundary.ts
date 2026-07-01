import type { Analyzer, DiffContext, Finding } from "../core/types.js";
import { stableFindingId } from "../core/finding-id.js";
import { parseAddedLines } from "../core/diff-lines.js";

const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  title: string;
  reason: string;
  severity: Finding["severity"];
  action: string;
  confidence: number;
}> = [
  {
    pattern: /\$\{\{\s*github\.event\.(issue|pull_request|comment)\.(body|title)/i,
    title: "Untrusted GitHub event content in workflow",
    reason:
      "PR/issue body or title flows into a workflow expression. This is a prompt/shell injection vector when combined with AI or script execution.",
    severity: "blocker",
    action: "Sanitize or avoid using untrusted event content in run steps, prompts, or shell commands.",
    confidence: 0.95,
  },
  {
    pattern: /process\.env\.(GITHUB_TOKEN|GH_TOKEN|OPENAI_API_KEY|SECRET)/i,
    title: "Secret or token referenced in code change",
    reason: "Changes touching secret/token access paths require careful review to prevent leakage or scope expansion.",
    severity: "high",
    action: "Verify token usage follows least-privilege and is not logged or exposed in output.",
    confidence: 0.8,
  },
  {
    pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/i,
    title: "Possible hardcoded secret",
    reason: "A literal value assigned to a secret-like variable may indicate a hardcoded credential.",
    severity: "blocker",
    action: "Remove hardcoded secrets and use environment variables or a secrets manager.",
    confidence: 0.75,
  },
  {
    pattern: /eval\s*\(|new\s+Function\s*\(|execSync\s*\(|child_process/i,
    title: "Dynamic code execution introduced",
    reason: "Dynamic execution functions are dangerous when influenced by PR content or external input.",
    severity: "high",
    action: "Replace dynamic execution with safe alternatives or add strict input validation.",
    confidence: 0.85,
  },
  {
    pattern: /permissions:\s*\n[\s\S]*?write-all|permissions:\s*write-all/i,
    title: "Workflow permissions set to write-all",
    reason: "Broad write-all permissions exceed least-privilege for PR review automation.",
    severity: "high",
    action: "Scope permissions to read for review jobs; use separate write job only for posting comments.",
    confidence: 0.9,
  },
  {
    pattern: /pull_request_target/i,
    title: "pull_request_target workflow trigger used",
    reason:
      "pull_request_target runs with base branch privileges and is risky with untrusted fork PR code.",
    severity: "high",
    action: "Avoid checkout of untrusted code in pull_request_target jobs; prefer pull_request where possible.",
    confidence: 0.9,
  },
  {
    pattern: /dangerouslySetInnerHTML|innerHTML\s*=/i,
    title: "Direct HTML injection API used",
    reason: "DOM injection APIs can introduce XSS if fed untrusted content.",
    severity: "high",
    action: "Sanitize input or use safe rendering alternatives.",
    confidence: 0.85,
  },
  {
    pattern: /auth.*bypass|skip.*auth|disable.*auth/i,
    title: "Possible authentication bypass",
    reason: "Changes suggest bypassing or disabling authentication checks.",
    severity: "blocker",
    action: "Remove auth bypass logic unless behind explicit test-only guards.",
    confidence: 0.7,
  },
];

export const securityBoundaryAnalyzer: Analyzer = {
  name: "security-boundary",

  async analyze(context: DiffContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const addedLines = parseAddedLines(context.diff);

    for (const { file, lineNumber, content } of addedLines) {
      for (const rule of SECURITY_PATTERNS) {
        if (!rule.pattern.test(content)) continue;

        findings.push({
          id: stableFindingId("sec", rule.title, file, content.trim()),
          severity: rule.severity,
          category: "security-boundary",
          title: rule.title,
          reason: rule.reason,
          evidence: [{ file, line: lineNumber, snippet: content.trim() }],
          suggestedAction: rule.action,
          confidence: rule.confidence,
          repro: `git diff ${context.base}...${context.head} -- ${file}`,
        });
      }
    }

    return dedupeFindings(findings);
  },
};

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.title}:${f.evidence[0]?.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}