# Backend CI Validation Contract

## Test Validation

### Commands

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check all services
pnpm typecheck
```

### Changed File Coverage Enforcement

For CI environments, enforce 100% coverage on changed files only:

```bash
# Get list of changed TypeScript files
CHANGED_FILES=$(git diff --name-only --diff-filter=ACMR origin/main...HEAD | grep '\.ts$' | grep -v '\.test\.ts$' | grep -v '\.spec\.ts$')

# Run tests with coverage on changed files only
if [ -n "$CHANGED_FILES" ]; then
  pnpm vitest --coverage --changed
fi
```

### Coverage Thresholds

- **Lines**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Statements**: 100%

These thresholds apply to changed files only, not the entire codebase.

### Quality Gates

All of the following must pass for CI to succeed:

1. **Unit Tests**: `pnpm test` exits with code 0
2. **Coverage**: 100% coverage on all changed files
3. **Type Check**: `pnpm typecheck` exits with code 0
4. **Lint**: `pnpm lint` exits with code 0 (when configured)

### GitHub Actions Workflow

Example workflow configuration (`.github/workflows/test.yml`):

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
        working-directory: backend

      - run: pnpm test:coverage
        working-directory: backend

      - run: pnpm typecheck
        working-directory: backend
```

### Local Development

Developers should run tests before committing:

```bash
# Quick test run
pnpm test

# Full validation (what CI runs)
pnpm test:coverage && pnpm typecheck
```

### Integration Tests

Integration tests should:
- Use a separate test database
- Clean up state between tests
- Run in CI after unit tests pass
- Not be included in coverage calculations (they test integration, not unit behavior)
