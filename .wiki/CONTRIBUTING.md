# Contributing to ɳFamily

Thank you for considering contributing to ɳFamily!

## Code of Conduct

Be respectful, inclusive, and constructive. This is a family-focused project — keep that spirit in all interactions.

## How to Contribute

### Reporting Bugs

Open an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, browser, versions)
- Screenshots/logs if applicable

### Suggesting Features

Open a discussion (not an issue) with:
- Clear use case
- Why this benefits families
- How it fits the product vision

### Submitting Code

**Important:** We follow Plan09 — a strict 9-phase development plan. All work is organized into phases. Random PRs will likely be rejected unless they align with the current phase.

1. **Check the current phase:** `.ai/planning/progress/TRACKER.md`
2. **Read the task definition:** `.ai/planning/phases/phase-N/PHASE.md`
3. **Ask first:** Open a discussion before starting work
4. **Follow the dev guide:** See [DEVELOPMENT.md](DEVELOPMENT.md)

## Development Standards

### TypeScript
- Strict mode — no `any` types
- JSDoc for all public functions
- Known inputs → expected outputs

### Testing
- 100% coverage on changed files
- Unit tests for all functions
- Integration tests for workflows
- E2E tests for critical flows

### Commits
- Descriptive messages: "P1-T03: Auth plugin skeleton"
- One logical change per commit
- No merge commits (rebase before merging)

### Code Review
- All code must be reviewed
- All tests must pass
- All lint checks must pass
- Coverage threshold must be met

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with tests
4. Run full test suite: `pnpm test`
5. Run linters: `pnpm lint`
6. Commit with clear messages
7. Push to your fork
8. Open a PR with:
   - Clear description of changes
   - Link to related issue/discussion
   - Screenshots/recordings if UI changes
   - Test evidence (coverage report)

### PR Review Criteria

- ✅ Code follows style guide
- ✅ All tests pass
- ✅ Coverage meets threshold (100% on changed files)
- ✅ No TypeScript errors
- ✅ Documentation updated
- ✅ Commits are clean and descriptive

## Project Constraints (Non-Negotiable)

1. **Backend is ɳSelf CLI + plugins only** — no ad-hoc services
2. **pnpm only** — no npm/yarn
3. **TypeScript strict mode** — no `any`
4. **Phases execute in order** — no jumping ahead
5. **No code push until phase complete** — all tasks must be done

## Getting Started

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup instructions.

## Questions?

- Read the wiki: `.wiki/Home.md`
- Open a discussion: `gh discussion create`
- Check existing issues: `gh issue list`

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE.md)).
