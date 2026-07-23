#!/usr/bin/env node
/**
 * angulux-license-guard — fails the build when a commercially licensed PrimeTek package
 * reaches the dependency tree.
 *
 * Usage: angulux-license-guard [path/to/project]
 *
 * Exit codes are a contract:
 *   0  verified clean
 *   1  a violation, or a package whose licence could not be verified
 */

import { run, EXIT_VIOLATION } from '../src/index.mjs';

const { code, lines } = run(process.argv[2] ?? process.cwd());
const write = code === EXIT_VIOLATION ? console.error : console.log;
for (const line of lines) write(line);
process.exit(code);
