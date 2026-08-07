# Repo Demo Plan Skill

Repo Demo Plan Skill is a local-first CLI and reusable agent skill for turning repository evidence into a short demo rehearsal plan. It inspects package metadata, README/docs, skill instructions, and optional evidence notes, then emits setup, workflow, failure, and verification beats without running repository commands.

## Quickstart

```bash
npm test
npm run smoke
npm run package:smoke
npm run install:smoke
npm run release:check
node src/cli.js fixtures/sample-repo --evidence fixtures/evidence.json --format markdown
```

## CLI

```bash
repo-demo-plan <repo-path> [--evidence evidence.json] [--format json|markdown]
```

Options may appear before or after the repository path. Unknown options,
duplicate `--evidence` or `--format` options, and options without a value exit
with status 1 and print a concise diagnostic to stderr. `--help` and `-h` print
usage and exit successfully.

The evidence file must contain a JSON object. `coreWorkflow`, `proofPath`,
`verification`, and `limit` are optional strings. `claims` is an optional array
of objects with a required string `text` field and an optional string `proof`
field, for example:

```json
{
  "coreWorkflow": "Run the smoke command.",
  "claims": [
    { "text": "The demo is reproducible locally.", "proof": "npm run smoke" }
  ]
}
```

Claims without proof are reported as warnings. Invalid JSON or an invalid field
shape exits with status 1 and prints a concise field-specific diagnostic.

## Example

```bash
node src/cli.js fixtures/sample-repo --format markdown
```

The output includes up to four prioritized demo commands, five demo beats, proof
paths, warnings, and a `ship` or `incubate` classification. The concise command
list is separate from safety analysis: every discovered package script is
checked for risky command text, including scripts that are not selected for the
demo.

Script commands use the package manager indicated by a canonical lockfile:
`package-lock.json` selects `npm`, `pnpm-lock.yaml` selects `pnpm`, and
`yarn.lock` selects `yarn`. Repositories without one of these lockfiles fall
back to `npm`. If multiple supported lockfiles are present, detection is
deterministic and uses this precedence: npm, then pnpm, then Yarn. The planner
only emits these commands; it does not execute them.

## Verification

```bash
npm run check
npm test
npm run smoke
npm run package:smoke
npm run install:smoke
npm run release:check
```

`npm run package:smoke` verifies the CLI entrypoint, skill instructions,
fixtures, support docs, changelog, and npm pack contents without publishing.
`npm run install:smoke` packs the tarball into a temporary project and runs the
installed `repo-demo-plan --help` command.

## Limitations

- The planner does not run commands; it only recommends a rehearsal path.
- Node package scripts are the first supported command source.
- Risk detection is conservative and string-based, and covers all discovered
  package scripts rather than only the selected demo commands.
- Missing README, docs, or skill files reduce confidence.

## Safety Notes

This tool is local-only by default. It does not post to social platforms, create
GitHub releases, publish packages, or mutate remote systems. Every discovered
package script that looks destructive or externally mutating is named with its
`package.json#scripts.<name>` source and marked for review, whether or not that
script appears in the prioritized demo command list.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and
[CONTRIBUTING.md](CONTRIBUTING.md) for local contribution checks.

## Install

```bash
npm install repo-demo-plan-skill
npx repo-demo-plan --help
```
