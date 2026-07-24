# Product Requirements

## Goal

Create a reusable local agent skill that converts repository evidence into a concise demo plan for launch content, video preparation, and maintainer review.

## Non-Goals

- Running commands automatically
- Posting content
- Publishing packages or releases
- Replacing full content generation tools

## MVP Requirements

- Inspect package metadata, README, docs, and `SKILL.md`
- Accept optional JSON evidence
- Generate setup, workflow, failure, and verification beats
- Select a concise list of prioritized runnable demo commands
- Warn on missing proof, missing runnable scripts, and risky commands found
  anywhere in the discovered package scripts
- Provide JSON and Markdown output
- Include fixture-backed tests and smoke validation

## Success Criteria

- Fixture demo plan includes runnable commands and proof paths
- Unsupported claims are warned
- Risky external-write scripts are named and source-linked before rehearsal,
  even when they are outside the selected demo command list
