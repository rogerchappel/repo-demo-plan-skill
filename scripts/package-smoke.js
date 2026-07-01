import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const requiredFiles = [
  "src/cli.js",
  "src/index.js",
  "fixtures/sample-repo/package.json",
  "fixtures/evidence.json",
  "scripts/install-smoke.js",
  "scripts/package-smoke.js",
  "SKILL.md",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md"
];

for (const file of requiredFiles) {
  assert.ok(existsSync(file), `expected ${file} to exist`);
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const files = new Set(packageJson.files ?? []);

for (const entry of ["src", "docs", "fixtures", "scripts", "SKILL.md", "README.md", "LICENSE", "SECURITY.md", "CONTRIBUTING.md", "CHANGELOG.md"]) {
  assert.ok(files.has(entry), `package files should include ${entry}`);
}

assert.equal(packageJson.bin["repo-demo-plan"], "./src/cli.js");

execFileSync("npm", ["pack", "--dry-run"], { stdio: "inherit" });
