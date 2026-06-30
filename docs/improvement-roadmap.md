# Signal Lens — Improvement Roadmap

**Created:** 2026-06-30 · **Base version:** v2.0.1

This roadmap organizes improvements into three phases, ordered by impact and risk.
Each item lists the problem, affected files, proposed fix, and verification.

---

## Phase 1 — Reliability Fixes (make existing features actually work)

These are bugs where a feature exists but does not behave correctly. They are
low-risk to fix and have the highest trust impact for users.

### 1.1 Unstable finding IDs break feedback memory

**Problem:** `ci-weakening` and `security-boundary` use `findings.length` (an
array index) in finding IDs. As soon as one more line matches, every ID shifts,
so a `false-positive` recorded today may suppress the wrong finding tomorrow.

- `src/analyzers/ci-weakening.ts:119` — `id: ci-${file.path}-${findings.length}`
- `src/analyzers/security-boundary.ts:109` — `id: sec-${file}-${findings.length}`

**Fix:** Replace the index with a deterministic hash of stable fields
(rule title + file + line number + snippet). Add a shared `stableFindingId()`
helper in `src/core/`.

**Verify:** New unit test that runs the same analyzer twice on the same diff
and asserts identical IDs, plus a test that adding an unrelated line before an
existing match does not change the existing finding's ID.

### 1.2 AI provider errors silently swallowed

**Problem:** All three real providers return empty findings on any HTTP error
(non-2xx, network failure, parse failure) without distinguishing "model found
nothing" from "401 invalid key" or "429 rate limited". The orchestrator then
reports `aiReview: "completed"`.

- `src/providers/openai.ts:65-67` — `if (!response.ok) return { findings: [], tokens: 0 };`
- `src/providers/anthropic.ts:43-45` — `if (!response.ok) continue;`
- `src/providers/ollama.ts:88-90` — `if (!res.ok) return [];`

**Fix:**
1. Add `error?: { status: number; message: string }` to `AiReviewResponse`
   (`src/providers/types.ts`).
2. On non-2xx, populate `error` with status code and a human-readable hint
   (401 → "API key invalid", 429 → "rate limited", 5xx → "provider error").
3. On network/parse failure, populate `error` with `"network"` / `"parse"`.
4. In `ai-review.ts`, propagate the error reason into the `ReviewResult.metadata`
   so it surfaces in the PR comment and JSON output.

**Verify:** Unit test with mocked `fetch` returning 401/429/500 — assert
`response.error` is populated and `skipReason` carries the status.

### 1.3 `Promise.all` aborts entire review on one analyzer failure

**Problem:** If any analyzer throws (e.g. `duplicate-utility` shells out to git
and git fails), the entire review rejects with no output.

- `src/orchestrator/review.ts:60` — `Promise.all(allAnalyzers.map(...))`

**Fix:** Switch to `Promise.allSettled`. Collect findings from fulfilled
results; for rejected ones, add a synthetic `low`-severity finding or a
`metadata.analyzerErrors` array so the user knows an analyzer failed.

**Verify:** Unit test injecting a throwing analyzer — assert the review still
returns results from other analyzers and records the error.

### 1.4 No config validation (zod is a dependency but unused)

**Problem:** A typo in `.signal-lens.yml` (e.g. `perspective:` singular,
`analyzers: ci-weakening: "yes"`) silently falls back to defaults with no
warning.

- `src/config/loader.ts:23-24` — raw YAML cast, no validation
- `src/config/schema.ts` — bare interface, no zod schema

**Fix:**
1. Define a zod schema mirroring `SignalLensConfig` in `src/config/schema.ts`.
2. In `loadConfig`, parse with `safeParse`; on failure, throw a descriptive
   error listing the invalid fields.
3. Warn on unknown keys (zod `.strict()` or `.passthrough()` + manual check).

**Verify:** Unit tests for: valid config, missing key (default applied with no
error), wrong type (error thrown), unknown key (warning).

### 1.5 Anthropic provider ignores `config.ai.model`

**Problem:** The Anthropic provider uses `ANTHROPIC_MODEL` env or a hardcoded
default, never `request.model`. A user who sets `ai.model: claude-sonnet-4`
gets Haiku silently.

- `src/providers/anthropic.ts:32` — `model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022"`
- `src/providers/anthropic.ts:63` — same in the return value

**Fix:** Use `request.model || process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022"`.

**Verify:** Unit test asserting `request.model` is honored over the env var.

### 1.6 AUTO provider always considers Ollama "available"

**Problem:** In AUTO mode with no cloud API key, the registry picks Ollama
even if it is not installed, then the review silently produces zero AI
findings.

- `src/providers/registry.ts:39` — `if (name === "ollama" || p.isAvailable()) return p;`

**Fix:** Add an optional async `healthCheck()` to the provider interface.
For Ollama, reuse the existing `/api/tags` ping. In AUTO mode, only select
Ollama if the ping succeeds; otherwise fall through to `mock` or report
"no provider available".

**Verify:** Unit test with unreachable Ollama — assert AUTO falls through.

### 1.7 Version string hardcoded in 4+ places

**Problem:** `"2.0.1"` is duplicated across files. `docs/security.md` already
drifted to `v2.0.0`.

- `src/cli.ts:26`, `src/orchestrator/review.ts:69`, `src/capabilities.ts:85`,
  `action.yml:66`, `tests/orchestrator.test.ts:24`

**Fix:** Create `src/core/version.ts` exporting `VERSION` read from
`package.json` at build time (or a generated constant). Import everywhere.
Update `tests/orchestrator.test.ts` to import the constant instead of a
literal.

**Verify:** `grep -r "2.0.1" src/` returns zero matches after the change.

### 1.8 Triplicated symbol-extraction regex

**Problem:** The same function/const/def regex list is duplicated in three
files, and none covers Go `func`, Rust `fn`, or Java methods.

- `src/analyzers/duplicate-utility.ts:5-9`
- `src/analyzers/test-coverage.ts:41-44`
- `src/indexer/symbols.ts:14-21`

**Fix:** Extract a shared `extractDiffSymbols(diff)` in `src/core/symbols.ts`
covering TS/JS/Python/Go/Rust/Java. Import in all three locations.

**Verify:** Existing analyzer tests pass; new test with a Go `func` diff
asserts the symbol is detected.

### 1.9 Dead `bodyHash` branch in duplicate-utility

**Problem:** `extractNewSymbols` never computes `bodyHash`, so the hash-match
branch at `duplicate-utility.ts:63` can never fire.

**Fix:** Either compute a body hash from subsequent diff lines, or remove the
dead branch and document that similarity is name-based only.

---

## Phase 2 — Onboarding & Usability (make it easy to adopt)

### 2.1 `signal-lens init` scaffolding command

Generate `.signal-lens.yml` with inline comments and a `$schema` directive.
Offer interactive provider choice (OpenAI / Anthropic / Ollama / static-only).

**Files:** new `src/cli-init.ts`, `src/cli.ts` (add command).

### 2.2 JSON Schema for `.signal-lens.yml`

Ship `docs/signal-lens.schema.json` and reference it via
`# yaml-language-server: $schema=...` in generated configs. Provides IDE
autocomplete and validation.

### 2.3 Auto-detect `--base` and `--head`

When `review` is called without explicit refs, detect the default branch
(`main`/`master`) as base and `HEAD` as head. The skill script already does
this; bring it into the CLI.

**Files:** `src/cli.ts:31-32` (make `--base`/`--head` optional), new
`src/core/git-default-branch.ts`.

### 2.4 Global error handler in CLI

Wrap `program.parse()` in a `try/catch`. On error, print a friendly message
with the likely cause and a link to troubleshooting docs, not a raw stack
trace. Also print a hint when `review` exits 1 due to blockers.

**Files:** `src/cli.ts:265`.

### 2.5 `--config <path>` override and `config show` command

Allow pointing to a custom config file. Add `signal-lens config show` to print
the resolved effective config (useful for debugging).

**Files:** `src/config/loader.ts` (accept path param), `src/cli.ts`.

### 2.6 SARIF upload step in GitHub Action

Add an optional `upload-sarif` input to `action.yml` that runs
`github/codeql-action/upload-sarif` when enabled. Document the required
`permissions: security-events: write`.

**Files:** `action.yml`, README.

### 2.7 Documentation gaps

Add dedicated docs:
- `docs/configuration.md` — every option, env vars, defaults
- `docs/providers.md` — provider differences, model selection, troubleshooting
- `docs/cli-reference.md` — all 12 commands with flags and examples
- `docs/troubleshooting.md` — "AI completed but no findings", provider errors
- `docs/writing-analyzers.md` — how to add a custom analyzer (Phase 3 enabler)

### 2.8 Consistent `-o`/`-f` flag semantics

Standardize: `-o` = output format everywhere, `-f` = output file everywhere.

**Files:** `src/cli.ts` (review, index, release commands).

---

## Phase 3 — Feature Expansion (more powerful analysis)

### 3.1 Custom rules engine

Allow users to define rules in `.signal-lens.yml`:

```yaml
rules:
  custom:
    - id: no-console-log
      pattern: "console\\.log"
      severity: low
      message: "Avoid leaving console.log in production code"
      paths: ["src/**/*.ts"]
      fileTypes: [".ts", ".tsx"]
```

**Design:**
- New `custom-rules` analyzer that reads config and applies regex/AST rules.
- Each rule: `id`, `pattern` (regex), `severity`, `message`, optional
  `paths` (glob), `fileTypes`, `onAddedOnly` (bool).
- Runs alongside existing analyzers.

**Files:** `src/config/schema.ts` (extend), `src/analyzers/custom-rules.ts`
(new), `src/orchestrator/review.ts` (wire in).

### 3.2 Additional static analyzers

Priority candidates (each is a new file in `src/analyzers/`):

| Analyzer | Detects | Patterns |
|----------|---------|----------|
| `dependency-risk` | Version downgrade, suspicious package, missing lockfile update | `package.json`, `requirements.txt`, `go.mod` diff |
| `injection` | SQL injection, path traversal, command injection, SSRF | `${...}` in query strings, `../`, unsanitized shell args |
| `unsafe-deserialization` | `pickle.loads`, `yaml.load` without SafeLoader, `eval` in Python | `.py` diffs |
| `secret-entropy` | Real secrets via Shannon entropy on string literals | High-entropy strings assigned to key-like names |
| `ci-broadening` | CircleCI/Jenkins/Buildkite config weakening | `.circleci/`, `Jenkinsfile`, `buildkite.yml` |

### 3.3 Multi-language symbol support

Extend `git ls-files` in the `index` command to include `.rs`, `.java`.
Extend import extraction to cover Go `import`, Rust `use`, Java `import`.

**Files:** `src/cli.ts:89`, `src/indexer/imports.ts`.

### 3.4 PR walkthrough summary comment

Generate a high-level summary comment on PR open: changed areas, risk
assessment, file-by-file walkthrough. Competitors (CodeRabbit, Greptile) treat
this as a core feature.

**Files:** new `src/reporters/walkthrough.ts`, wire into GitHub Action and App.

### 3.5 Incremental re-review

On `push` to an existing PR, only re-review files changed since the last
review. Store reviewed-SHA in `review_history` and compute the incremental
diff.

**Files:** `src/orchestrator/review.ts`, `src/memory/history.ts`.

### 3.6 Data-flow / taint analysis (long-term)

Move beyond lexical pattern matching to track untrusted input flow through
the codebase. This is the biggest differentiator but also the highest effort.
Defer until the custom-rules engine and additional analyzers are stable.

---

## Execution Order

```
Phase 1 (reliability)     1.1 → 1.7 → 1.2 → 1.5 → 1.6 → 1.3 → 1.4 → 1.8 → 1.9
Phase 2 (usability)       2.3 → 2.4 → 2.1 → 2.2 → 2.5 → 2.6 → 2.7 → 2.8
Phase 3 (expansion)       3.3 → 3.1 → 3.2 → 3.4 → 3.5 → 3.6
```

Each item should be: implement → add/update tests → `npm run lint && npm test`
→ update CHANGELOG.
