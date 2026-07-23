#!/usr/bin/env node
/**
 * angulux-migrate — shows what migrating a PrimeNG project to angulux would change.
 *
 * Usage: angulux-migrate [path/to/project]
 *
 * This command REPORTS. It does not write. Write mode is a separate, explicitly requested
 * mode, and it will refuse to run against a dirty working tree — because the only honest
 * guarantee a codemod can offer is that you can throw its work away.
 */

import { report } from '../src/index.mjs';

const { code, lines } = report(process.argv[2] ?? process.cwd());
for (const line of lines) console.log(line);
process.exit(code);
