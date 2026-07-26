#!/usr/bin/env node
import { loadEvidence, planDemo, formatMarkdown } from "./index.js";

function parseArgs(argv) {
  const args = { repo: null, evidence: null, format: "json" };
  const seenOptions = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--evidence" || value === "--format") {
      if (seenOptions.has(value)) throw new Error(`Duplicate option: ${value}`);
      const optionValue = argv[index + 1];
      if (optionValue === undefined || optionValue.startsWith("-")) {
        throw new Error(`Missing value for ${value}`);
      }
      seenOptions.add(value);
      args[value.slice(2)] = optionValue;
      index += 1;
    } else if (value === "--help" || value === "-h") args.help = true;
    else if (value.startsWith("-")) throw new Error(`Unknown option: ${value}`);
    else if (!args.repo) args.repo = value;
    else throw new Error(`Unexpected argument: ${value}`);
  }
  return args;
}

function usage() {
  return `Usage: repo-demo-plan <repo-path> [--evidence evidence.json] [--format json|markdown]\n`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.repo) {
    process.stdout.write(usage());
    process.exit(args.help ? 0 : 1);
  }
  const plan = planDemo(args.repo, { evidence: loadEvidence(args.evidence) });
  if (args.format === "markdown") {
    process.stdout.write(formatMarkdown(plan));
  } else if (args.format === "json") {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } else {
    throw new Error(`Unsupported format: ${args.format}`);
  }
  process.exit(plan.warnings.some((warning) => warning.level === "fail") ? 2 : 0);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
