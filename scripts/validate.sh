#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
npm run smoke >/tmp/repo-demo-plan-smoke.md
grep -q "Demo Plan: sample-agent-tool" /tmp/repo-demo-plan-smoke.md
