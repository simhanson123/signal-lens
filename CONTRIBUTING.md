# Contributing to review-mcp

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/simhanson123/review-mcp.git
cd review-mcp
npm install
npm test
```

## Pull Request Guidelines

1. Open an issue or comment on an existing one before large changes
2. Keep PRs focused — one feature or fix per PR
3. Add tests for new analyzers or classifier rules
4. Update fixture snapshots in `fixtures/snapshots/` for new detection scenarios
5. Run `npm run lint && npm test && npm run build` before submitting

## Adding an Analyzer

1. Create `src/analyzers/your-analyzer.ts` implementing the `Analyzer` interface
2. Register it in `src/analyzers/index.ts`
3. Add unit tests in `tests/analyzers.test.ts`
4. Add a fixture snapshot in `fixtures/snapshots/`

## Code Style

- TypeScript strict mode
- ES modules (`import`/`export`)
- No unnecessary comments — prefer clear naming

## License

By contributing, you agree that your contributions will be licensed under the MIT License.