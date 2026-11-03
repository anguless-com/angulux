/**
 * The pure half of scan-prime-names — the parts added on 2026-08-03, kept here so they can be
 * tested without importing the codemod itself (that file writes to disk under `--fix`, and a
 * test suite must never be one stray argument away from rewriting `src/`).
 *
 * Everything here is a pure function of text. No fs, no process, no exit.
 */

/**
 * Every backtick literal in a file that contains a tag — i.e. the inline templates.
 *
 * The attribute net needs this and the element-tag net does not: `<p-foo` cannot occur in
 * TypeScript by accident, but a bare `pFoo` can (`const pFoo = 1`, `{ pFoo: 2 }`), so the
 * attribute matcher must never see anything but template text.
 *
 * Returns [{start, body}] where `start` is the offset of the body in the original text.
 */
export function templateLiterals(text) {
    const out = [];
    for (let i = 0; i < text.length; i++) {
        if (text[i] !== '`' || (i && text[i - 1] === '\\')) continue;
        let j = i + 1;
        for (; j < text.length; j++) {
            if (text[j] === '\\') {
                j++;
                continue;
            }
            if (text[j] === '`') break;
        }
        const body = text.slice(i + 1, j);
        if (/<[a-zA-Z]/.test(body)) out.push({ start: i + 1, body });
        i = j;
    }
    return out;
}

/** `s` with every character but a newline turned into a space: same length, same lines. */
const blank = (s) => s.replace(/[^\n]/g, ' ');

/** Offset of the quote that closes a '…' or "…" string opened just before `j`. */
function stringEnd(text, j, quote) {
    for (; j < text.length; j++) {
        if (text[j] === '\\') j++;
        else if (text[j] === quote || text[j] === '\n') return j;
    }
    return text.length;
}

/** Offset of the backtick that closes a template literal whose body starts at `j`. */
function literalEnd(text, j) {
    while (j < text.length) {
        if (text[j] === '\\') j += 2;
        else if (text[j] === '`') return j;
        else if (text[j] === '$' && text[j + 1] === '{') j = interpolationEnd(text, j + 2) + 1;
        else j++;
    }
    return text.length;
}

/** Offset of the `}` that closes a `${` whose expression starts at `j`. Nested literals included. */
function interpolationEnd(text, j) {
    let depth = 0;
    while (j < text.length) {
        const c = text[j];
        if (c === '`') j = literalEnd(text, j + 1) + 1;
        else if (c === "'" || c === '"') j = stringEnd(text, j + 1, c) + 1;
        else {
            if (c === '{') depth++;
            else if (c === '}' && depth-- === 0) return j;
            j++;
        }
    }
    return text.length;
}

/**
 * Every stylesheet held in a backtick literal (#175).
 *
 * A literal counts when it is marked as CSS (`/*css*\/ \`…\`` or a `css\`…\`` tag), or when it
 * sits in a `style/` file and holds a rule block. The second half is what keeps the net up when
 * someone adds a stylesheet and forgets the marker; the `{` test is what keeps out the class-name
 * templates those same files are full of (`\`p-button-${severity}\``).
 *
 * Comments and quoted strings in the file are skipped, so a backtick in prose (`display`) cannot
 * pair with one in code. Each `${…}` is blanked, so an interpolated stylesheet is not read as part
 * of this one and every offset still points into the original text.
 *
 * Returns [{start, css}] where `start` is the offset of the body in the original text.
 */
export function cssLiterals(text, inStyleDir = false) {
    const out = [];
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        const next = text[i + 1];
        if (c === '/' && next === '/') {
            const eol = text.indexOf('\n', i);
            i = eol < 0 ? text.length : eol;
        } else if (c === '/' && next === '*') {
            const close = text.indexOf('*/', i + 2);
            i = close < 0 ? text.length : close + 2;
        } else if (c === "'" || c === '"') {
            i = stringEnd(text, i + 1, c) + 1;
        } else if (c === '`') {
            const end = literalEnd(text, i + 1);
            let css = '';
            for (let j = i + 1; j < end; ) {
                if (text[j] === '\\') {
                    css += text.slice(j, j + 2);
                    j += 2;
                } else if (text[j] === '$' && text[j + 1] === '{') {
                    const close = Math.min(interpolationEnd(text, j + 2), end - 1);
                    css += blank(text.slice(j, close + 1));
                    j = close + 1;
                } else {
                    css += text[j++];
                }
            }
            const marked = /(?:\/\*\s*css\s*\*\/|\bcss)\s*$/i.test(text.slice(Math.max(0, i - 16), i));
            if (marked || (inStyleDir && css.includes('{'))) out.push({ start: i + 1, css });
            i = end + 1;
        } else {
            i++;
        }
    }
    return out;
}

/**
 * A `p-*` name in type-selector position, once attribute selectors are blanked: not preceded by
 * `.` (a class, which angulux keeps), `#`, `:` (a pseudo), `-` or a word character (part of a
 * longer name such as `--p-x`), or a backslash.
 */
const P_TYPE_SELECTOR_RE = /(?<![\w.#:\\-])(p-[A-Za-z][\w-]*)/g;

/**
 * The `p-*` element names a stylesheet still selects by (#175): `p-inputnumber.ng-invalid`,
 * `th p-columnfilter`. None of them has matched an element since the rename to `agl-*`, and none
 * of them fails anything — a rule that matches nothing is silent.
 *
 * Only selector preludes are read. A declaration value (`animation: p-animate-drawer-enter 1s`),
 * a keyframe name or step, a comment and a quoted string are not selectors, and `.p-foo` stays a
 * class. Returns [{name, index}] with `index` an offset into `css`.
 */
export function pTypeSelectors(css) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(["'])(?:(?!\1)[^\\\n]|\\.)*\1/g, blank);
    const hits = [];
    let from = 0;
    for (let i = 0; i < clean.length; i++) {
        const c = clean[i];
        if (c === ';' || c === '}') {
            from = i + 1;
        } else if (c === '{') {
            // The text since the last `;`, `{` or `}` is this block's prelude. An at-rule's
            // (`@media …`, `@keyframes name`) is not a selector; a keyframe step (`from`, `50%`)
            // is read like one and can hold no p-* name.
            const prelude = clean.slice(from, i);
            if (!prelude.trimStart().startsWith('@')) {
                const selector = prelude.replace(/\[[^\]]*\]/g, blank);
                for (const m of selector.matchAll(P_TYPE_SELECTOR_RE)) hits.push({ name: m[1], index: from + m.index });
            }
            from = i + 1;
        }
    }
    return hits;
}

/**
 * A PrimeNG-branded directive attribute in attribute position: preceded by whitespace, `[`
 * or `(`, and followed by `=`, `]`, `)`, whitespace, `/` or `>`. Same shape the rename
 * codemod uses, but with a generic name instead of the 35-entry allowlist.
 */
export const TEMPLATE_ATTR_RE = /(?<=[\s[(])(p[A-Z][a-zA-Z0-9]*)(?=[=\])\s/>])/g;

/**
 * A public signal input/output/model whose name carries the PrimeTek prefix.
 * The decorator matcher (`@Input() pFoo`) cannot see this form, which is how 15 branded
 * names reached the published API.
 */
export const SIGNAL_PROP_RE = /\b(p[A-Z][a-zA-Z0-9]*)\s*=\s*(?:input|output|model)\b/g;

/**
 * The declared regions where a PrimeTek brand string is not a defect.
 *
 * MIT does not merely permit the copyright notice, it OBLIGES it, and the showcase renders
 * that notice to readers — so a gate that forbade the words outright would be a gate that
 * keeps a licence violation green. This is the narrow hole that lets the notice exist:
 *
 *   • Both comment syntaxes, because the notice lives where it is RENDERED — inside an
 *     Angular template, where `/* … *​/` is not a comment at all but text the reader sees.
 *   • Only brand PROSE is excused by it. Callers apply it to groups 8 and 9 and to nothing
 *     else, so a selector, a `primeng/*` import or a branded input inside a region still
 *     fails: no licence obligation has ever required shipping those.
 *   • Capped, so nobody can quietly wrap a whole file in it.
 *
 * Returns [{start, end, size}] over the whole marker, `size` being the excused body.
 */
export const ATTRIBUTION_MAX = 2000;

const ATTRIBUTION_RE = /(?:\/\*|<!--)\s*prime-names:attribution\b(?:(?!\*\/|-->)[\s\S])*(?:\*\/|-->)([\s\S]*?)(?:\/\*|<!--)\s*prime-names:end\s*(?:\*\/|-->)/g;

export function attributionRanges(text) {
    return [...text.matchAll(ATTRIBUTION_RE)].map((m) => ({ start: m.index, end: m.index + m[0].length, size: m[1].length }));
}

/**
 * The Angular major this line is bound to, read from the catalog that feeds the published
 * peerDependencies. `name-exceptions.json` expires against it.
 */
export function angularMajorFrom(workspaceYaml) {
    const m = workspaceYaml.match(/'@angular\/core':\s*\^?(\d+)\./);
    if (!m) throw new Error('cannot read @angular/core from pnpm-workspace.yaml — name-exceptions.json cannot be expired safely');
    return Number(m[1]);
}

/**
 * Enforce the exception list in BOTH directions. An exception list nobody checks is the
 * same hazard as the blind spot it was written for:
 *   • past its Angular major, nothing is exempt any more and the list must be deleted;
 *   • an entry naming something that is no longer in src/ is stale and fails.
 * Returns {exempt: Set, problems: string[]}.
 */
export function exemptionState(exceptions, angularMajor, namesFoundInSrc) {
    const problems = [];
    if (angularMajor > exceptions.untilAngularMajor) {
        problems.push(
            `the exception list EXPIRED: it was written for Angular ${exceptions.untilAngularMajor} and this line now targets ` +
                `Angular ${angularMajor}. That major bump is the window where renaming a public input is free — rename the ` +
                `${exceptions.publicApiNames.length} names and delete tools/codemod/name-exceptions.json.`
        );
        return { exempt: new Set(), problems };
    }
    for (const name of exceptions.publicApiNames) {
        if (!namesFoundInSrc.has(name)) problems.push(`STALE exception: \`${name}\` is no longer anywhere in src/ — remove it from name-exceptions.json`);
    }
    return { exempt: new Set(exceptions.publicApiNames), problems };
}
