import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../packages/angulux/src');

/**
 * A style rule that names a component by its HOST ELEMENT must cover every spelling the
 * component's `selector:` declares, and must not name a host no component declares (#174).
 *
 * A consumer may write any declared spelling (`agl-toggleswitch`, `agl-toggleSwitch`,
 * `agl-toggle-switch`). CSS type selectors match HTML tag names case-insensitively, so the
 * camelCase form is covered by its lowercase twin, but the kebab-case form is a different name:
 * a rule that lists only one of them styles one spelling and silently skips the rest. A name no
 * component declares matches nothing. Neither shows up in a type-check or a failing spec, which
 * is how five such rules outlived the rename to `agl-*`.
 *
 * Read from source, not from a browser: `host-selectors.spec.ts` proves the rules that exist
 * paint what they should; this proves the set of names each rule lists is the right set.
 */

const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
    }
    return out;
};

/** lowercase spelling -> the set of lowercase spellings its component declares */
function declaredHosts() {
    const bySpelling = new Map();
    for (const file of walk(src)) {
        if (file.includes('/style/')) continue;
        for (const m of readFileSync(file, 'utf8').matchAll(/selector:\s*'([^']+)'/g)) {
            const spellings = m[1]
                .split(',')
                .map((s) => s.trim())
                .filter((s) => /^agl-[A-Za-z-]+$/.test(s))
                .map((s) => s.toLowerCase());
            if (spellings.length === 0) continue;
            const group = new Set(spellings);
            for (const s of group) bySpelling.set(s, group);
        }
    }
    return bySpelling;
}

/** [style file, the lowercase agl-* host names it mentions] */
function styleHosts() {
    const out = [];
    for (const dir of readdirSync(src)) {
        const styleDir = join(src, dir, 'style');
        if (!existsSync(styleDir)) continue;
        for (const name of readdirSync(styleDir).filter((n) => n.endsWith('.ts'))) {
            const file = join(styleDir, name);
            // Comments are prose (the badge style explains itself by naming hosts), not rules.
            const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
            const names = new Set([...code.matchAll(/\bagl-[A-Za-z][A-Za-z-]*/g)].map((m) => m[0].toLowerCase()));
            out.push([file.slice(src.length + 1), names]);
        }
    }
    return out;
}

test('every agl-* host a style rule names covers all spellings its component declares, and none is dead', () => {
    const declared = declaredHosts();
    const files = styleHosts();
    // A scan that found nothing proves nothing: the rename alone left a dozen host rules.
    assert.ok(declared.size > 50, `only ${declared.size} declared host spellings found under ${src}`);
    const named = files.reduce((n, [, names]) => n + names.size, 0);
    assert.ok(named >= 10, `only ${named} agl-* host names found across ${files.length} style files`);

    const problems = [];
    for (const [file, names] of files) {
        for (const name of names) {
            const group = declared.get(name);
            if (!group) {
                problems.push(`${file}: ${name} is declared by no component (dead)`);
                continue;
            }
            const missing = [...group].filter((s) => !names.has(s));
            if (missing.length) problems.push(`${file}: names ${name} but not ${missing.join(', ')}`);
        }
    }
    assert.deepEqual(problems, []);
});
