import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("README documents the available source install path", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const installSection = readme.match(/## Install\n([\s\S]*?)(?=\n## |$)/)?.[1];

  assert.ok(installSection, "README should contain an Install section");
  assert.match(installSection, /not currently published to the npm registry/i);
  assert.match(
    installSection,
    /git clone https:\/\/github\.com\/rogerchappel\/repo-demo-plan-skill\.git/
  );
  assert.match(installSection, /\bnpm install\b/);
  assert.match(installSection, /npm exec -- repo-demo-plan --help/);
  assert.doesNotMatch(
    installSection,
    /npm install repo-demo-plan-skill/,
    "README must not present the unavailable registry package as installable"
  );
});
