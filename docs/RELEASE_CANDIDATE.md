# Release Candidate Notes

## Scope

Initial public build of `repo-demo-plan-skill`.

## Verification

```bash
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
bash scripts/validate.sh
```

`npm run package:smoke` asserts the CLI entrypoint, reusable skill file,
fixtures, changelog, license, security policy, and contributing guide are
present before running `npm pack --dry-run`.

## 2026-07-01 Release Readiness Addendum

- Added root security and contributing guidance for public support workflows.
- Extended package smoke coverage beyond tarball listing to verify release
  critical files and bin metadata.
- Included support docs in the npm publish allowlist.

## 2026-06-25 Verification Result

- `npm run check`: passed
- `npm test`: passed, 3 tests
- `npm run smoke`: passed through `scripts/validate.sh`
- `bash scripts/validate.sh`: passed

## Classification

`ship`: the fixture-backed CLI produces useful demo plans, flags unsupported claims, and stays local-only.
