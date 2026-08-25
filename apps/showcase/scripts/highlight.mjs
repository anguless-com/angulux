/**
 * Syntax colouring, done once at BUILD time and shipped as tokens.
 *
 * Why not in the browser: Shiki carries TextMate grammars and full theme files, and the
 * smallest honest browser bundle for two languages and two themes is a few hundred kilobytes
 * — on a site whose whole initial JavaScript payload is 306 KB. Worse, these pages are
 * prerendered: highlighting on the client would mean a crawler receives grey text and a
 * reader watches the code repaint after boot. Done here, nothing about Shiki reaches a
 * browser at all.
 *
 * Why tokens rather than Shiki's HTML: rendering Shiki's output would mean `innerHTML`, and
 * Angular's sanitizer strips the inline `style` attribute that carries every colour — so the
 * only way to make it work is `bypassSecurityTrustHtml`. Tokens go through ordinary template
 * bindings instead, which are safe by construction. There is no HTML string to trust.
 *
 * The shape is built for size, because these payloads are downloaded:
 *
 *   • Colours are a PALETTE. A file uses a dozen or so distinct colours across thousands of
 *     tokens, so each token carries a small integer instead of two hex strings.
 *   • Tokens matching the theme's default foreground carry `c: -1` and render as bare text
 *     with no element around them. That is roughly half of them.
 *   • Adjacent tokens of the same colour are merged. Shiki splits on grammar scope, which
 *     changes far more often than colour does.
 */
import { createHighlighter } from 'shiki';

/**
 * Two themes, resolved to two colours per palette entry, so the toggle is pure CSS: the light
 * value lands in `--l`, the dark one in `--d`, and a static rule picks between them. A
 * JavaScript-driven swap would repaint after boot, which on a prerendered page is a flash.
 */
const THEMES = { light: 'github-light', dark: 'github-dark' };

/**
 * Angular's own grammars — `[value]="x"` and `@if` are syntax here, not stray punctuation.
 * `shell` is for the guide pages, which show commands as well as code.
 */
const LANGS = { template: 'angular-html', source: 'angular-ts', shell: 'shellscript' };

/**
 * `{ color, '--shiki-dark' }` -> one comparable string.
 *
 * Lower-cased because the two ends of the comparison disagree on case: token styles come back
 * as `#24292E` and the document default as `#24292e`. Comparing them raw makes every single
 * token look non-default, which costs a span around every space in the file.
 */
const styleKey = (light, dark) => `${(light ?? '').toLowerCase()}|${(dark ?? '').toLowerCase()}`;

/**
 * One highlighter, loaded once. Grammars and themes are the expensive part, and Shiki says so
 * out loud — building one per module printed an escalating "10 instances… 50 instances" warning
 * and re-parsed both grammars fifty-one times.
 *
 * `scope()` is what varies per output file: a fresh palette over the same highlighter, so each
 * module's payload carries only the colours its own code uses.
 */
export async function createTokenizer() {
    const highlighter = await createHighlighter({ themes: Object.values(THEMES), langs: Object.values(LANGS) });

    return {
        scope() {
            const palette = [];
            const seen = new Map();

            const slot = (style) => {
                const key = styleKey(style?.color, style?.['--shiki-dark']);

                if (!seen.has(key)) {
                    seen.set(key, palette.length);
                    palette.push([style?.color ?? '', style?.['--shiki-dark'] ?? '']);
                }

                return seen.get(key);
            };

            /** `code` -> lines of `{ t, c }`, `c` being a palette index or -1 for default text. */
            const tokenize = (code, kind) => {
                const result = highlighter.codeToTokens(code, { lang: LANGS[kind], themes: THEMES });
                const rootKey = defaultKey(result.fg);

                const lines = result.tokens.map((line) => {
                    const out = [];

                    for (const token of line) {
                        const key = styleKey(token.htmlStyle?.color, token.htmlStyle?.['--shiki-dark']);
                        const colour = key === rootKey ? -1 : slot(token.htmlStyle);
                        const previous = out[out.length - 1];

                        if (previous && previous.c === colour) {
                            previous.t += token.content;
                        } else {
                            out.push({ t: token.content, c: colour });
                        }
                    }

                    return out;
                });

                // The payload ships tokens ONLY — the raw text is dropped, and Copy rebuilds
                // the original from them. That is sound exactly as long as the tokens are a
                // complete partition of the input, which is a property of Shiki rather than a
                // promise this code can keep. So it is checked here, per block, and the build
                // fails rather than quietly putting mangled code on someone's clipboard.
                if (lines.map((line) => line.map((token) => token.t).join('')).join('\n') !== code) {
                    throw new Error('tokens do not reassemble into the original source — the Copy button would hand the reader something else');
                }

                return lines;
            };

            return { tokenize, palette };
        }
    };
}

/**
 * The document's default foreground, from Shiki's `fg`.
 *
 * With two themes that field is not a colour but a fragment of a style attribute —
 * `#24292e;--shiki-dark:#e1e4e8` — so it has to be taken apart rather than compared directly.
 * If a future version returns a plain colour instead, the split yields one part and the dark
 * half comes back empty, which stops matching and costs size rather than correctness.
 */
function defaultKey(fg) {
    const [light, ...rest] = String(fg ?? '').split(';');
    const dark = rest
        .join(';')
        .split(':')
        .slice(1)
        .join(':')
        .trim();

    return styleKey(light.trim(), dark);
}
