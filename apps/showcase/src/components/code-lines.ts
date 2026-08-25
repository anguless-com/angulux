import { Component, input } from '@angular/core';
import { CodeLine } from '../data';

/**
 * Renders pre-tokenised code. The colouring was done at build time by `scripts/highlight.mjs`
 * — this only paints what it was handed.
 *
 * Two details carry the whole design:
 *
 *   • Each token gets `--l` and `--d`, and a static CSS rule picks between them by whether
 *     `.dark` is on the document. Nothing here reads the current theme, so the colours in a
 *     prerendered page are already correct for both themes before any script runs. Binding
 *     `color` directly against a theme signal would have meant every code block repainting
 *     after boot.
 *   • A token in the default foreground (`c` of -1, roughly half of them) is emitted as bare
 *     text with no element at all. On a page like `/table` that is thousands of spans not
 *     created and not serialised into the HTML.
 *
 * Lines are block elements rather than text separated by newlines, because Angular collapses
 * whitespace in templates and `<pre>` is not an exception to that.
 */
@Component({
    selector: 'agl-code-lines',
    standalone: true,
    template: `<pre
        class="thin-scroll overflow-x-auto p-4 text-[13px] leading-[1.6]"
    ><code>@for (line of lines(); track $index) {<span class="block min-h-[1.6em]">@for (token of line; track $index) {@if (token.c < 0) {{{ token.t }}} @else {<span
        [style.--l]="palette()[token.c][0]"
        [style.--d]="palette()[token.c][1]"
        class="tk"
    >{{ token.t }}</span>}}</span>}</code></pre>`
})
export class CodeLines {
    readonly lines = input.required<CodeLine[]>();

    readonly palette = input.required<[string, string][]>();
}
