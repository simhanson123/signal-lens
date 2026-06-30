# Next Session Plan — 7 Features

**Status:** ✅ All 7 features implemented in v2.2.0 · 151 tests passing
**Target version:** v2.2.0 · **Base branch:** `feat/v2.1.0-reliability-usability-expansion`

---

## 1. Inline Ignore Comments

**Goal:** Suppress findings via source comments like `// signal-lens-ignore-next-line`.

**New file:** `src/core/ignore-comments.ts`

**Logic:**
- Scan diff added lines for: `signal-lens-ignore-next-line`, `signal-lens-ignore`, `signal-lens-disable-next-line`
- Also support file-level: `signal-lens-disable` (all findings in file) / `signal-lens-enable`
- Build a set of `{file, line}` pairs to suppress
- Filter findings where `evidence[0].file` + `evidence[0].line` matches

**Wire-in:** `src/orchestrator/review.ts` — after `filterByFeedback`, add `filterByIgnoreComments(findings, context.diff)`

**Files to touch:**
- `src/core/ignore-comments.ts` (new, ~70 lines)
- `src/orchestrator/review.ts` (1 import + 1 line)
- `tests/ignore-comments.test.ts` (new, ~60 lines)

**Comment syntax (all languages):**
```
// signal-lens-ignore-next-line — reason here
# signal-lens-ignore-next-line
/* signal-lens-ignore-next-line */
```

---

## 2. PR Auto-Labeling

**Goal:** Automatically add/remove GitHub labels based on review findings.

**New file:** `src/github/labeler.ts`

**Label mapping:**
| Condition | Label |
|-----------|-------|
| Any blocker finding | `signal-lens:blocker` |
| security-boundary or injection finding | `signal-lens:security` |
| ci-weakening finding | `signal-lens:ci` |
| test-coverage finding | `signal-lens:test-gap` |
| custom-rule finding | `signal-lens:custom` |
| Zero findings | `signal-lens:clean` |

**Logic:**
- `computeLabels(result: ReviewResult): string[]` — pure function, testable
- `applyLabels(octokit, owner, repo, prNumber, labels)` — GitHub API call
- Remove stale `signal-lens:*` labels before adding new ones

**Wire-in:**
- CLI: `signal-lens label --owner X --github-repo Y --pr N`
- Action: `apply-labels: "true"` input
- `review --apply-labels` flag

**Files to touch:**
- `src/github/labeler.ts` (new, ~90 lines)
- `src/cli.ts` (add `label` command + `--apply-labels` flag on review)
- `action.yml` (add `apply-labels` input)
- `tests/labeler.test.ts` (new, ~50 lines)

---

## 3. Secret Entropy Scanner

**Goal:** Detect real secrets by calculating Shannon entropy on string literals.

**New file:** `src/analyzers/secret-entropy.ts`

**Logic:**
- Extract string literals from added diff lines: `"..."`, `'...'`, `` `...` ``
- Compute Shannon entropy: `H = -sum(p_i * log2(p_i))` over character frequencies
- Flag if: `entropy >= 4.5 AND length >= 20 AND looks-like-secret-context`
- Context check: the variable/property name contains `key|secret|token|password|api|auth|credential`

**Threshold rationale:** AWS keys (~4.7 entropy), JWT tokens (~4.8), hex secrets (~4.0). Random base64 = ~6.0. English text = ~4.2.

**Wire-in:**
- `src/config/schema.ts` — add `"secret-entropy": z.boolean().default(true)`
- `src/orchestrator/review.ts` — add analyzer
- `src/analyzers/index.ts` — export

**Files to touch:**
- `src/analyzers/secret-entropy.ts` (new, ~90 lines)
- `src/config/schema.ts` (1 line)
- `src/orchestrator/review.ts` (2 lines)
- `src/analyzers/index.ts` (2 lines)
- `tests/secret-entropy.test.ts` (new, ~60 lines)

---

## 4. Dependency Vulnerability Check

**Goal:** Check added/changed dependencies against the OSV database.

**New file:** `src/analyzers/dependency-vuln.ts`

**Logic:**
1. Detect diff in: `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`
2. Parse added dependency names + versions from diff:
   - npm: `"lodash": "4.17.0"` → `{ name: "lodash", version: "4.17.0", ecosystem: "npm" }`
   - pip: `flask==2.0.0` → `{ name: "flask", version: "2.0.0", ecosystem: "PyPI" }`
   - go: `github.com/gin-gonic/gin v1.7.0` → Go ecosystem
   - cargo: `serde = "1.0"` → crates.io
3. Query OSV API: `POST https://api.osv.dev/v1/query` with `{ package: { name, ecosystem }, version }`
4. If vulnerabilities found, create findings (severity from OSV severity or "high")

**Resilience:**
- Network failure → skip gracefully, log warning
- Rate limit → batch queries (OSV supports batch: `POST /v1/querybatch`)
- Timeout: 5s per query

**Wire-in:**
- `src/config/schema.ts` — add `"dependency-vuln": z.union([z.boolean(), z.literal("auto")]).default("auto")` (auto = only if network available)

**Files to touch:**
- `src/analyzers/dependency-vuln.ts` (new, ~130 lines)
- `src/config/schema.ts` (1 line)
- `src/orchestrator/review.ts` (2 lines)
- `src/analyzers/index.ts` (2 lines)
- `tests/dependency-vuln.test.ts` (new, ~70 lines, mock fetch)

---

## 5. AI Parallel Perspective Calls

**Goal:** Run all perspectives concurrently instead of sequentially (3x speedup).

**Current:** `for (const perspective of request.perspectives) { await this.callPerspective(...) }`

**Target:** `Promise.all(request.perspectives.map(p => this.callPerspective(...)))`

**Files to modify:**
- `src/providers/openai.ts` — change loop to `Promise.all` (~5 lines)
- `src/providers/anthropic.ts` — change loop to `Promise.all` (~5 lines)
- `src/providers/ollama.ts` — change loop to `Promise.all` (~5 lines)

**Key concern:** Error collection must still work — `firstError` pattern is preserved because each `callPerspective` returns its own `error` field, and `Promise.all` resolves as long as no promise rejects (analyzers catch internally).

**Tests:** Add timing test in `tests/provider.test.ts` — assert parallel execution completes faster than sequential would (mock fetch with artificial delay).

---

## 6. Slack/Discord Notifications

**Goal:** Send finding summary to Slack/Discord webhook on blocker/high findings.

**New file:** `src/notifications/webhook.ts`

**Logic:**
- `formatSlackMessage(result: ReviewResult): object` — Slack Block Kit format
- `formatDiscordMessage(result: ReviewResult): object` — Discord webhook format
- `sendNotification(webhookUrl: string, result: ReviewResult): Promise<void>`
- Auto-detect Slack vs Discord from URL (Slack: `hooks.slack.com`, Discord: `discord.com/api/webhooks`)

**Message content:**
- Repo name + PR title (if available)
- Risk level badge
- Blocker/high finding titles (top 5)
- Link to full report

**Wire-in:**
- CLI: `review --notify <url>` flag
- Env: `SIGNAL_LENS_WEBHOOK_URL`
- Action: `notify-webhook: ""` input (URL string)

**Files to touch:**
- `src/notifications/webhook.ts` (new, ~100 lines)
- `src/core/types.ts` — add `webhookUrl?: string` to ReviewOptions
- `src/cli.ts` — add `--notify` flag
- `action.yml` — add `notify-webhook` input
- `tests/webhook.test.ts` (new, ~50 lines, mock fetch)

---

## 7. Review Quality Trends

**Goal:** Track review metrics over time from `review_history`.

**New file:** `src/core/trends.ts`

**Data source:** `review_history` table (already has `finding_count`, `blocker_count`, `created_at`, `result_json`) + `feedback` table.

**Metrics:**
- Finding count trend (last N reviews)
- Category distribution (from `result_json.findings[].category`)
- False-positive rate: `count(feedback where type='false-positive') / count(all findings)` over time
- Average review duration (`result_json.metadata.durationMs`)
- AI vs static finding ratio

**Output formats:**
- `signal-lens trends` — markdown table (terminal-friendly)
- `signal-lens trends -o json` — JSON for dashboards

**Files to touch:**
- `src/core/trends.ts` (new, ~110 lines)
- `src/cli.ts` — add `trends` command
- `tests/trends.test.ts` (new, ~60 lines)

---

## Execution Order

```
5 (parallel AI)     →  smallest change, immediate value
1 (ignore comments) →  small, high daily-use value
2 (auto-labeling)   →  small, high visibility
3 (secret entropy)  →  new analyzer
6 (notifications)   →  new module
4 (dependency vuln) →  largest, network-dependent
7 (trends)          →  analysis on existing data
```

**Estimated total:** ~700 lines new code + ~400 lines tests = ~1100 lines

**After all 7:** Bump version to 2.2.0, update CHANGELOG, rebuild, test, commit, PR.
