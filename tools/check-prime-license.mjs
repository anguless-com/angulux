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

import { resolve } from 'node:path';
import { run, EXIT_VIOLATION } from '../packages/angulux-license-guard/src/index.mjs';
import { auditRefQuarantine } from './lib/ref-quarantine.mjs';

const root = resolve(process.argv[2] ?? process.cwd());

// Stage 1 — the published guard, unchanged: is anything commercial in the tree we BUILD?
const { code, lines } = run(root);
const write = code === EXIT_VIOLATION ? console.error : console.log;
for (const line of lines) write(line);

// Stage 2 — the repo-local question the published guard has no business asking: is anything
// non-MIT PARKED in ref/, and is it written down? `ref/` is an angulux convention, so this
// lives here rather than in `angulux-license-guard`, whose contract other people depend on.
//
// Both stages always run. Short-circuiting on a stage-1 failure would mean the run that most
// needs a full picture is the one that prints half of it.
const quarantine = auditRefQuarantine(root);
(quarantine.ok ? console.log : console.error)('');
for (const line of quarantine.lines) (quarantine.ok ? console.log : console.error)(line);

process.exit(code === EXIT_VIOLATION || !quarantine.ok ? EXIT_VIOLATION : 0);
