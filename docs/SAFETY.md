# Safety

Repo Demo Plan Skill is a planner, not an executor.

## Default Boundary

- Reads local repository files
- Emits JSON or Markdown to stdout
- Does not run generated commands
- Does not post, publish, tag, merge, release, or write to external systems

## Review Before Rehearsal

Review any command marked `warn` before running it. The built-in detector flags common destructive or externally mutating command patterns, but callers remain responsible for checking project-specific scripts.

## Public Launch Use

Human approval is required before using a generated demo plan for public launch material, social posts, release notes, package publishing, or live account actions.
