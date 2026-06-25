import test from "node:test";
import assert from "node:assert/strict";
import { planDemo, formatMarkdown } from "../src/index.js";

test("builds a grounded demo plan from fixture repo", () => {
  const plan = planDemo("fixtures/sample-repo", {
    evidence: {
      coreWorkflow: "Run the smoke command.",
      proofPath: "docs/PRD.md",
      verification: "npm run smoke"
    }
  });
  assert.equal(plan.repo.name, "sample-agent-tool");
  assert.ok(plan.commands.some((command) => command.command === "npm run smoke"));
  assert.ok(plan.beats.some((beat) => beat.proof === "SKILL.md"));
});

test("flags risky package scripts and unsupported claims", () => {
  const plan = planDemo("fixtures/sample-repo", {
    evidence: { claims: [{ text: "Has production customers" }] }
  });
  assert.ok(plan.warnings.some((warning) => warning.message.includes("risky script")));
  assert.ok(plan.warnings.some((warning) => warning.message.includes("Claim lacks proof")));
});

test("formats markdown with commands and beats", () => {
  const markdown = formatMarkdown(planDemo("fixtures/sample-repo"));
  assert.match(markdown, /# Demo Plan: sample-agent-tool/);
  assert.match(markdown, /## Commands/);
  assert.match(markdown, /## Beats/);
});
