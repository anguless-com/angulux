#!/usr/bin/env node
/**
 * check-prime-license — fails the build if a commercially licensed PrimeTek package
 * reaches the dependency tree.
 *
 * This is the guard behind the project's core claim. "We are MIT" is a promise; a build
 * that refuses to complete when a commercial package appears is a proof.
 *
 * ---
 *
 * THE IMPLEMENTATION LIVES IN `packages/angulux-license-guard/`, published to npm as
 * `angulux-license-guard`. This file stays at this path on purpose: five things reference it
 * — `check:license` here and in `packages/angulux`, README.md, PROVENANCE.md, and
 * `.github/workflows/license-cron.yml`. Moving it would have meant chasing the name through
 * all five, and that is the exact failure mode this project has already paid for six times.
 *
 * The boundary table is NOT duplicated here. It is declared once, in
 * `packages/angulux-license-guard/src/boundary.mjs`, and a test enforces that there is only
 * one declaration — two copies of a legal record is a record that can disagree with itself.
 *
 * Usage:  node tools/check-prime-license.mjs [path/to/project]
 * Wiring: add it to the package's "prebuild" script (Constitution P4).
 *
 * Exit codes: 0 = verified clean · 1 = violation or unverifiable.
 */

import { run, EXIT_VIOLATION } from '../packages/angulux-license-guard/src/index.mjs';

const { code, lines } = run(process.argv[2] ?? process.cwd());
const write = code === EXIT_VIOLATION ? console.error : console.log;
for (const line of lines) write(line);
process.exit(code);
