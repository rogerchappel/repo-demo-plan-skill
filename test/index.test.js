import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadEvidence, planDemo, formatMarkdown } from "../src/index.js";

function runCli(args) {
  return spawnSync(process.execPath, ["src/cli.js", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8"
  });
}

function withEvidenceFile(contents, callback) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "repo-demo-plan-evidence-"));
  const evidencePath = path.join(fixture, "evidence.json");
  try {
    fs.writeFileSync(evidencePath, contents);
    callback(evidencePath);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
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

function withRepositoryFixture(lockfiles, callback) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "repo-demo-plan-manager-"));
  try {
    fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({
      name: "manager-fixture",
      scripts: { test: "node --test" }
    }));
    fs.writeFileSync(path.join(fixture, "README.md"), "# Fixture\n");
    for (const lockfile of lockfiles) fs.writeFileSync(path.join(fixture, lockfile), "");
    callback(planDemo(fixture));
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

for (const [lockfile, packageManager] of [
  ["package-lock.json", "npm"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"]
]) {
  test(`uses ${packageManager} commands when ${lockfile} is present`, () => {
    withRepositoryFixture([lockfile], (plan) => {
      assert.equal(plan.repo.packageManager, packageManager);
      assert.equal(plan.commands[0].command, `${packageManager} run test`);
    });
  });
}

test("falls back to npm when no supported lockfile is present", () => {
  withRepositoryFixture([], (plan) => {
    assert.equal(plan.repo.packageManager, "npm");
    assert.equal(plan.commands[0].command, "npm run test");
  });
});

test("uses documented precedence when supported lockfiles conflict", () => {
  withRepositoryFixture(["yarn.lock", "pnpm-lock.yaml", "package-lock.json"], (plan) => {
    assert.equal(plan.repo.packageManager, "npm");
    assert.equal(plan.commands[0].command, "npm run test");
  });
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

test("loadEvidence rejects malformed JSON with a stable diagnostic", () => {
  withEvidenceFile("{", (evidencePath) => {
    assert.throws(() => loadEvidence(evidencePath), {
      message: "Evidence file contains invalid JSON."
    });
  });
});

for (const [name, evidence, message] of [
  ["non-object root", [], "Evidence must be a JSON object."],
  ["wrong scalar type", { coreWorkflow: 42 }, "Evidence field 'coreWorkflow' must be a string."],
  ["non-array claims", { claims: {} }, "Evidence field 'claims' must be an array."],
  ["non-object claim", { claims: ["claim"] }, "Evidence claim at index 0 must be an object."],
  ["claim without string text", { claims: [{}] }, "Evidence claim at index 0 field 'text' must be a string."],
  ["claim with non-string proof", { claims: [{ text: "Claim", proof: false }] }, "Evidence claim at index 0 field 'proof' must be a string."]
]) {
  test(`planDemo rejects evidence with ${name}`, () => {
    assert.throws(() => planDemo("fixtures/sample-repo", { evidence }), { message });
  });

  test(`CLI rejects evidence with ${name}`, () => {
    withEvidenceFile(JSON.stringify(evidence), (evidencePath) => {
      const result = runCli(["fixtures/sample-repo", "--evidence", evidencePath]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, `${message}\n`);
    });
  });
}

test("CLI rejects malformed evidence JSON", () => {
  withEvidenceFile("{", (evidencePath) => {
    const result = runCli(["fixtures/sample-repo", "--evidence", evidencePath]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "Evidence file contains invalid JSON.\n");
  });
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
