# Orchestration

## Agent Flow

1. Confirm the repository path and intended demo context.
2. Run the planner in Markdown mode.
3. Inspect warnings and proof paths.
4. Manually run selected commands in the target repo.
5. Copy observed results into launch notes or video prep docs.

## Tool Boundaries

The CLI reads local files only. Agents must not treat suggested commands as already executed. External posting, package publishing, release creation, or account writes require separate explicit approval.

## Failure Handling

- `fail` warnings mean the demo plan is not ready to use.
- `warn` findings require review but may be acceptable with human context.
- Missing docs should be fixed in the source repo or disclosed in the demo notes.
