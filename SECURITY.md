# Security Policy

## Supported Versions

`repo-demo-plan-skill` is pre-1.0. Security fixes are prepared for the latest
published version and the current `main` branch.

## Reporting a Vulnerability

Please report vulnerabilities through GitHub issues or by contacting the
maintainer directly if the report includes sensitive details. Include:

- the affected version or commit
- the command or input that reproduces the issue
- whether the issue can expose local files, credentials, or remote systems

Do not include real secrets, private repository contents, or customer data in a
public issue. Use redacted fixtures when possible.

## Scope

The CLI reads local repository files and optional evidence JSON. It does not
publish packages, post content, create releases, call external APIs, or mutate
remote systems. Reports involving local file reads, unsafe command
recommendations, or misleading evidence handling are in scope.
