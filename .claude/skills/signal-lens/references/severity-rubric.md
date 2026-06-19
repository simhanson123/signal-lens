# signal-lens Severity Rubric

Use this when summarizing findings for the maintainer.

| Severity | Meaning | Action |
|----------|---------|--------|
| **blocker** | Merge must not proceed — CI weakened, secret exposure, untrusted input in workflow | Stop and fix before merge |
| **high** | Serious regression likely — security boundary, missing tests on critical path | Fix or explicit maintainer waiver |
| **medium** | Worth addressing — duplicate utility, partial test gap | Track in PR or follow-up |
| **low** | Informational — style, minor duplication hint | Optional |

## Response format

1. **Verdict** — merge / fix blockers first / needs discussion (one line)
2. **Blockers** — list with file, line, evidence, suggested action
3. **High** — same, max 5 items
4. **Skipped noise** — do not list every medium/low unless user asks

## False positives

If the user disagrees with a finding, run:

```bash
signal-lens feedback --finding-id <ID> --type false-positive --reason "<why>"
```

Recorded feedback is applied on the next review in this repository.