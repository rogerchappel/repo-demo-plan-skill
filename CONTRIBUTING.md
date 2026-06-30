# Contributing

Thanks for helping improve `repo-demo-plan-skill`.

## Local Setup

```bash
npm install
npm run release:check
```

## Change Guidelines

- Keep demo plans evidence-backed and deterministic.
- Add or update a fixture when behavior changes.
- Prefer local-only checks; the CLI should not post, publish, or call external
  APIs.
- Update `README.md` or `docs/RELEASE_CANDIDATE.md` when commands or release
  expectations change.

## Pull Request Checklist

- Run `npm run release:check`.
- Include the relevant command output in the PR body.
- Note any known limitations or unsupported claims introduced by the change.
