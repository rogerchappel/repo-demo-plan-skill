import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { planDemo, formatMarkdown } from "../src/index.js";

function runCli(args) {
  return spawnSync(process.execPath, ["src/cli.js", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8"
  });
}

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
  assert.deepEqual(
    plan.commands.map((command) => command.label),
    ["smoke", "test", "check", "build"]
  );
  assert.ok(plan.warnings.some((warning) =>
    warning.message.includes("publish-demo") &&
    warning.message.includes("package.json#scripts.publish-demo")
  ));
  assert.ok(!plan.warnings.some((warning) => warning.message.includes("scripts.docs")));
  assert.ok(plan.warnings.some((warning) => warning.message.includes("Claim lacks proof")));
});

test("formats markdown with commands and beats", () => {
  const markdown = formatMarkdown(planDemo("fixtures/sample-repo"));
  assert.match(markdown, /# Demo Plan: sample-agent-tool/);
  assert.match(markdown, /## Commands/);
  assert.match(markdown, /## Beats/);
});

test("CLI rejects unknown options", () => {
  const result = runCli(["--bogus"]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "Unknown option: --bogus\n");
});

for (const option of ["--evidence", "--format"]) {
  test(`CLI rejects a missing value for ${option}`, () => {
    const result = runCli(["fixtures/sample-repo", option]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `Missing value for ${option}\n`);
  });

  test(`CLI rejects duplicate ${option} options`, () => {
    const value = option === "--evidence" ? "fixtures/evidence.json" : "json";
    const result = runCli([
      "fixtures/sample-repo",
      option,
      value,
      option,
      value
    ]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `Duplicate option: ${option}\n`);
  });
}

test("CLI accepts options before and after the repository path", () => {
  const before = runCli([
    "--format",
    "json",
    "--evidence",
    "fixtures/evidence.json",
    "fixtures/sample-repo"
  ]);
  const after = runCli([
    "fixtures/sample-repo",
    "--evidence",
    "fixtures/evidence.json",
    "--format",
    "json"
  ]);
  assert.equal(before.status, 0, before.stderr);
  assert.equal(after.status, 0, after.stderr);
  assert.deepEqual(JSON.parse(before.stdout), JSON.parse(after.stdout));
});

test("CLI help remains successful", () => {
  const result = runCli(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Usage: repo-demo-plan/);
  assert.equal(result.stderr, "");
});
