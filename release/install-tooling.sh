#!/usr/bin/env bash
#
# Install semantic-release and its plugins for a release run, OUTSIDE the repository.
#
# Why not devDependencies: this repository's dependency tree IS its license risk surface
# (SECURITY.md) and its lockfile is evidence. Release tooling has no business in either.
#
# Why not `npx -p semantic-release -p @semantic-release/...`, which is what this used to be:
# semantic-release loads plugins with resolve-from(cwd, name) — out of the PROJECT's
# node_modules — while npx leaves them in its own cache. Every plugin came back
# MODULE_NOT_FOUND. The workflow is dispatch-only and the first publish was manual, so nothing
# executed this path until 2026-07-30, when the first dry-run failed on the first plugin.
#
# Why not `npm install` in the repository: this is a pnpm workspace whose manifests use the
# `catalog:` and `workspace:` protocols. npm cannot resolve either.
#
# So: an isolated tree in $RUNNER_TEMP, reached through NODE_PATH. Nothing lands in the
# repository, which means the tooling cannot leak into the manifest or the lockfile.
#
# Reads $SR_TOOLING (exact pins, set in the workflow env). Writes NODE_PATH to $GITHUB_ENV and
# the tooling's bin directory to $GITHUB_PATH, so later steps just run `semantic-release`.

set -euo pipefail

: "${SR_TOOLING:?SR_TOOLING must list the exact tooling pins}"
: "${RUNNER_TEMP:?this script expects to run on a GitHub Actions runner}"

dir="$RUNNER_TEMP/release-tooling"
mkdir -p "$dir"
printf '{"name":"release-tooling","private":true}\n' >"$dir/package.json"

# Deliberately word-split: SR_TOOLING is a list of specifiers.
# shellcheck disable=SC2086
(cd "$dir" && npm install --no-audit --no-fund --loglevel=error $SR_TOOLING)

# The check that would have caught the npx arrangement. Resolve every plugin the way
# semantic-release will, from the repository as cwd, and fail here rather than three steps later
# with a stack trace out of semantic-release's plugin loader.
NODE_PATH="$dir/node_modules" node - <<'PROBE'
const Module = require('node:module');
const fake = new Module('', null);
fake.paths = Module._nodeModulePaths(process.cwd());

const missing = [];
for (const name of (process.env.SR_TOOLING || '').trim().split(/\s+/)) {
    const pkg = name.replace(/@[^@\/]*$/, ''); // strip the version pin, keep any scope
    try {
        Module._resolveFilename(pkg, fake, false);
    } catch {
        missing.push(pkg);
    }
}

if (missing.length) {
    console.error('::error::the release tooling is installed but not resolvable from the repository:');
    for (const m of missing) console.error('  - ' + m);
    console.error('semantic-release resolves plugins from the project cwd. Check NODE_PATH.');
    process.exit(1);
}
console.log('release tooling resolves from the repository: ' + process.env.SR_TOOLING.trim().split(/\s+/).length + ' package(s)');
PROBE

echo "NODE_PATH=$dir/node_modules" >>"$GITHUB_ENV"
echo "$dir/node_modules/.bin" >>"$GITHUB_PATH"
