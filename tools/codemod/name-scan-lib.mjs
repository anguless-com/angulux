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
