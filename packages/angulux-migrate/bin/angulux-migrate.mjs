#!/usr/bin/env node
/**
 * angulux-migrate — shows what migrating a PrimeNG project to angulux would change,
 * and applies it when asked.
 *
 * Usage:
 *   angulux-migrate [path]            report only; writes nothing
 *   angulux-migrate [path] --write    apply it; requires a clean git tree
 *
 * There is no flag that bypasses the clean-tree requirement. The one guarantee a codemod
 * can honestly offer is that its work can be thrown away, and an escape hatch on that is
 * the guarantee being optional.
 */

import { report, EXIT_REFUSED } from '../src/index.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const target = args.find((a) => !a.startsWith('-')) ?? process.cwd();

const { code, lines } = report(target, { write });
const out = code === EXIT_REFUSED ? console.error : console.log;
for (const line of lines) out(line);
process.exit(code);
