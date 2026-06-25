# Release Candidate Notes

## Scope

Initial public build of `repo-demo-plan-skill`.

## Verification

```bash
npm run check
npm test
npm run smoke
bash scripts/validate.sh
```

## Classification

`ship`: the fixture-backed CLI produces useful demo plans, flags unsupported claims, and stays local-only.
