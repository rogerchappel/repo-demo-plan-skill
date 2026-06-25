import fs from "node:fs";
import path from "node:path";

const SCRIPT_WEIGHT = new Map([
  ["smoke", 10],
  ["test", 9],
  ["check", 8],
  ["build", 7],
  ["lint", 6],
  ["start", 4]
]);

const RISKY_COMMAND = /\b(rm\s+-rf|git\s+push|npm\s+publish|gh\s+release|curl\b.*\|\s*sh|sudo\b|terraform\s+apply)\b/i;

export function loadEvidence(filePath) {
  if (!filePath) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function inspectRepository(repoPath) {
  const absolute = path.resolve(repoPath);
  const packagePath = path.join(absolute, "package.json");
  const readmePath = findFirst(absolute, ["README.md", "readme.md"]);
  const docsDir = path.join(absolute, "docs");
  const skillPath = path.join(absolute, "SKILL.md");
  const packageJson = fs.existsSync(packagePath)
    ? JSON.parse(fs.readFileSync(packagePath, "utf8"))
    : {};
  const readme = readmePath ? fs.readFileSync(readmePath, "utf8") : "";
  const docs = fs.existsSync(docsDir)
    ? fs.readdirSync(docsDir).filter((name) => name.endsWith(".md")).sort()
    : [];
  const scripts = Object.entries(packageJson.scripts || {})
    .map(([name, command]) => ({ name, command, weight: SCRIPT_WEIGHT.get(name) || 1 }))
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));

  return {
    path: absolute,
    name: packageJson.name || path.basename(absolute),
    description: packageJson.description || firstParagraph(readme),
    hasReadme: Boolean(readmePath),
    hasSkill: fs.existsSync(skillPath),
    docs,
    scripts,
    readmeHeadings: headings(readme),
    packageManager: fs.existsSync(path.join(absolute, "package-lock.json")) ? "npm" : "npm"
  };
}

export function planDemo(repoPath, options = {}) {
  const repo = inspectRepository(repoPath);
  const evidence = options.evidence || {};
  const chosenScripts = chooseScripts(repo.scripts);
  const commands = chosenScripts.map((script) => ({
    label: script.name,
    command: `${repo.packageManager} run ${script.name}`,
    risk: RISKY_COMMAND.test(script.command) ? "warn" : "local",
    source: `package.json#scripts.${script.name}`
  }));

  const beats = [
    {
      title: "Open with the problem",
      narration: `Introduce ${repo.name}: ${repo.description || "a local-first repository workflow"}.`,
      proof: repo.hasReadme ? "README.md" : "missing README"
    },
    {
      title: "Show the local setup path",
      narration: commands.length ? "Run the install-free or npm script path shown in package metadata." : "Explain setup manually because no package scripts were found.",
      command: commands[0]?.command,
      proof: commands[0]?.source || "missing package script"
    },
    {
      title: "Demonstrate the core workflow",
      narration: evidence.coreWorkflow || "Run the smoke or test command and describe the output in plain language.",
      command: commands.find((item) => item.label === "smoke")?.command || commands[1]?.command,
      proof: evidence.proofPath || (repo.docs[0] ? `docs/${repo.docs[0]}` : "missing docs evidence")
    },
    {
      title: "Handle failure and limits",
      narration: evidence.limit || "Call out local-only behavior, unsupported claims, and commands that should not be run during recording.",
      proof: repo.hasSkill ? "SKILL.md" : "missing SKILL.md"
    },
    {
      title: "Close with verification",
      narration: "Summarize what passed, what was not exercised, and where a reviewer can reproduce the demo.",
      command: commands.find((item) => item.label === "test")?.command || commands[0]?.command,
      proof: evidence.verification || "package scripts"
    }
  ];

  const warnings = collectWarnings(repo, commands, beats, evidence);
  return {
    repo,
    beats,
    commands,
    warnings,
    classification: warnings.some((warning) => warning.level === "fail") ? "incubate" : "ship"
  };
}

export function formatMarkdown(plan) {
  const lines = [
    `# Demo Plan: ${plan.repo.name}`,
    "",
    `Classification: ${plan.classification}`,
    "",
    "## Commands"
  ];
  if (plan.commands.length === 0) {
    lines.push("- No package scripts were discovered.");
  } else {
    for (const command of plan.commands) {
      lines.push(`- ${command.command} (${command.risk}; ${command.source})`);
    }
  }
  lines.push("", "## Beats");
  for (const [index, beat] of plan.beats.entries()) {
    lines.push(`${index + 1}. ${beat.title}`);
    lines.push(`   - Narration: ${beat.narration}`);
    if (beat.command) lines.push(`   - Command: ${beat.command}`);
    lines.push(`   - Proof: ${beat.proof}`);
  }
  lines.push("", "## Warnings");
  if (plan.warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const warning of plan.warnings) {
      lines.push(`- ${warning.level}: ${warning.message}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function chooseScripts(scripts) {
  const names = new Set();
  const chosen = [];
  for (const script of scripts) {
    if (chosen.length >= 4) break;
    if (!names.has(script.name)) {
      chosen.push(script);
      names.add(script.name);
    }
  }
  return chosen;
}

function collectWarnings(repo, commands, beats, evidence) {
  const warnings = [];
  if (!repo.hasReadme) warnings.push({ level: "fail", message: "README.md is missing, so the opening claim has no stable source." });
  if (!repo.hasSkill) warnings.push({ level: "warn", message: "SKILL.md is missing, so side-effect boundaries are not obvious." });
  if (commands.length === 0) warnings.push({ level: "fail", message: "No package scripts found for a runnable demo." });
  for (const command of commands.filter((item) => item.risk === "warn")) {
    warnings.push({ level: "warn", message: `Command '${command.command}' maps to a risky script and should be reviewed before rehearsal.` });
  }
  for (const beat of beats) {
    if (String(beat.proof).startsWith("missing")) {
      warnings.push({ level: "warn", message: `${beat.title} has weak proof: ${beat.proof}.` });
    }
  }
  for (const claim of evidence.claims || []) {
    if (!claim.proof) warnings.push({ level: "warn", message: `Claim lacks proof: ${claim.text}` });
  }
  return warnings;
}

function findFirst(root, names) {
  for (const name of names) {
    const filePath = path.join(root, name);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function firstParagraph(markdown) {
  return markdown
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^# .*\n?/, "").trim())
    .find(Boolean) || "";
}

function headings(markdown) {
  return markdown
    .split("\n")
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, "").trim());
}
