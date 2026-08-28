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

function withManifestFixture(contents, callback) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "repo-demo-plan-manifest-"));
  try {
    fs.writeFileSync(path.join(fixture, "package.json"), contents);
    fs.writeFileSync(path.join(fixture, "README.md"), "# Fixture\n");
    fs.writeFileSync(path.join(fixture, "SKILL.md"), "# Fixture\n");
    callback(fixture);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

function assertApiAndCliReject(repoPath, message) {
  assert.throws(() => planDemo(repoPath), { message });
  const result = runCli([repoPath]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, `${message}\n`);
}

test("API and CLI reject a missing repository path", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "repo-demo-plan-missing-"));
  fs.rmSync(fixture, { recursive: true, force: true });
  assertApiAndCliReject(fixture, "Repository path does not exist.");
});

test("API and CLI reject a repository path that is a file", () => {
  withEvidenceFile("not a directory", (filePath) => {
    assertApiAndCliReject(filePath, "Repository path must be a directory.");
  });
});

for (const [name, contents, message] of [
  ["malformed JSON", "{", "package.json contains invalid JSON."],
  ["non-object manifest", "[]", "package.json must contain a JSON object."],
  ["non-object scripts", JSON.stringify({ scripts: "test" }), "package.json field 'scripts' must be an object."],
  ["non-string script value", JSON.stringify({ scripts: { test: 42 } }), "package.json script 'test' must be a non-blank string."],
  ["blank script value", JSON.stringify({ scripts: { test: "  " } }), "package.json script 'test' must be a non-blank string."],
  ["blank script name", JSON.stringify({ scripts: { " ": "node --test" } }), "package.json script names must not be blank."]
]) {
  test(`API and CLI reject ${name}`, () => {
    withManifestFixture(contents, (fixture) => assertApiAndCliReject(fixture, message));
  });
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

for (const [name, evidence, message] of [
  ["blank core workflow", { coreWorkflow: " \t\n" }, "Evidence field 'coreWorkflow' must not be blank."],
  ["blank proof path", { proofPath: " \t\n" }, "Evidence field 'proofPath' must not be blank."],
  ["blank verification", { verification: " \t\n" }, "Evidence field 'verification' must not be blank."],
  ["blank limit", { limit: " \t\n" }, "Evidence field 'limit' must not be blank."],
  ["blank claim text", { claims: [{ text: " \t\n" }] }, "Evidence claim at index 0 field 'text' must not be blank."],
  ["blank claim proof", { claims: [{ text: "Claim", proof: " \t\n" }] }, "Evidence claim at index 0 field 'proof' must not be blank."]
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

test("normalizes surrounding evidence whitespace before planning", () => {
  const plan = planDemo("fixtures/sample-repo", {
    evidence: {
      coreWorkflow: "  Run the smoke command.  ",
      proofPath: "  docs/PRD.md  ",
      verification: "  npm run smoke  ",
      limit: "  Local use only.  ",
      claims: [{ text: "  Reproducible locally.  ", proof: "  npm run smoke  " }]
    }
  });

  assert.equal(plan.beats[2].narration, "Run the smoke command.");
  assert.equal(plan.beats[2].proof, "docs/PRD.md");
  assert.equal(plan.beats[3].narration, "Local use only.");
  assert.equal(plan.beats[4].proof, "npm run smoke");
  assert.ok(!plan.warnings.some((warning) => warning.message.includes("Claim lacks proof")));
});

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

test("contains multiline evidence and repository values within Markdown lines", () => {
  const plan = planDemo("fixtures/sample-repo", {
    evidence: {
      coreWorkflow: "workflow one\nworkflow two",
      proofPath: "proof one\r\nproof two",
      verification: "verify one\rverify two",
      limit: "limit one\nlimit two",
      claims: [{ text: "claim one\nclaim two" }]
    }
  });
  plan.repo.name = "repo one\nrepo two";
  plan.commands[0].source = "package.json\r\n# injected";

  const markdown = formatMarkdown(plan);

  for (const continuation of ["workflow two", "proof two", "verify two", "limit two", "claim two", "repo two", "# injected"]) {
    assert.ok(!markdown.split("\n").includes(continuation));
  }
  assert.match(markdown, /^# Demo Plan: repo one repo two$/m);
  assert.match(markdown, /Narration: workflow one workflow two/);
  assert.match(markdown, /Proof: proof one proof two/);
  assert.match(markdown, /Proof: verify one verify two/);
  assert.match(markdown, /Narration: limit one limit two/);
  assert.match(markdown, /Claim lacks proof: claim one claim two/);
  assert.match(markdown, /package\.json # injected/);
  assert.equal(plan.beats[2].narration, "workflow one\nworkflow two");
});

test("CLI contains multiline evidence in Markdown and preserves it in JSON", () => {
  const evidence = {
    coreWorkflow: "workflow one\nworkflow two",
    proofPath: "proof one\r\nproof two",
    verification: "verify one\rverify two",
    limit: "limit one\nlimit two",
    claims: [{ text: "claim one\nclaim two" }]
  };
  withEvidenceFile(JSON.stringify(evidence), (evidencePath) => {
    const markdown = runCli(["fixtures/sample-repo", "--evidence", evidencePath, "--format", "markdown"]);
    const json = runCli(["fixtures/sample-repo", "--evidence", evidencePath, "--format", "json"]);
    assert.equal(markdown.status, 0, markdown.stderr);
    assert.equal(json.status, 0, json.stderr);
    assert.match(markdown.stdout, /Narration: workflow one workflow two/);
    assert.match(markdown.stdout, /Claim lacks proof: claim one claim two/);
    assert.equal(JSON.parse(json.stdout).beats[2].narration, evidence.coreWorkflow);
    assert.equal(JSON.parse(json.stdout).beats[4].proof, evidence.verification);
  });
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
