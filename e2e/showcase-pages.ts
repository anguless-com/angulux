import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Every page the showcase has: the three written pages and one per module in the registry. */
export function showcasePages(): string[] {
    const src = readFileSync(join(__dirname, '../apps/showcase/src/doc/registry.ts'), 'utf8');
    const modules = [...src.matchAll(/^ {4}([a-z][\w]*): \[$/gm)].map((m) => m[1]);

    return ['/', '/getting-started', '/theming', ...modules.map((m) => `/${m}`)];
}
