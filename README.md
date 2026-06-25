# Repo Demo Plan Skill

Repo Demo Plan Skill is a local-first CLI and reusable agent skill for turning repository evidence into a short demo rehearsal plan. It inspects package metadata, README/docs, skill instructions, and optional evidence notes, then emits setup, workflow, failure, and verification beats without running repository commands.

## Quickstart

```bash
npm test
npm run smoke
node src/cli.js fixtures/sample-repo --evidence fixtures/evidence.json --format markdown
```

## CLI

```bash
repo-demo-plan <repo-path> [--evidence evidence.json] [--format json|markdown]
```

The JSON evidence file can include `coreWorkflow`, `proofPath`, `verification`, `limit`, and `claims`. Claims without proof are reported as warnings.

## Example

```bash
node src/cli.js fixtures/sample-repo --format markdown
```

The output includes a command list, five demo beats, proof paths, warnings, and a `ship` or `incubate` classification.

## Limitations

- The planner does not run commands; it only recommends a rehearsal path.
- Node package scripts are the first supported command source.
- Risk detection is conservative and string-based.
- Missing README, docs, or skill files reduce confidence.

## Safety Notes

This tool is local-only by default. It does not post to social platforms, create GitHub releases, publish packages, or mutate remote systems. Commands that look destructive or externally mutating are marked for review.
