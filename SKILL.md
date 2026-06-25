# Repo Demo Plan Skill

Use this skill when an agent needs to prepare a live demo, recorded walkthrough, or launch rehearsal from an existing repository.

## Required Inputs

- Repository path
- Optional evidence JSON with proof paths and claims
- Human-approved launch or recording context when the demo will be published

## Workflow

1. Run `repo-demo-plan <repo-path> --format markdown`.
2. Review commands and warnings before rehearsing.
3. Confirm every claim has a proof path.
4. Run the selected commands manually in the target repository.
5. Add observed command output to the launch or video notes.

## Side-Effect Boundaries

The planner reads local files and writes only to stdout. It must not run commands, publish packages, post content, tag releases, or write to external systems.

## Approval Requirements

Get explicit human approval before using the resulting plan for public posting, package publishing, release creation, or any live external account action.

## Examples

```bash
repo-demo-plan . --evidence demo-evidence.json --format markdown
repo-demo-plan fixtures/sample-repo --format json
```

## Validation

Run `npm run validate`. A valid result has passing tests, a smoke output containing `Demo Plan`, and no unreviewed fail-level warnings.
