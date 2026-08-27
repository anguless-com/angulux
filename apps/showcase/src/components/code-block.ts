import { Component, computed, input, signal } from '@angular/core';
import { CodeLine } from '../data';
import { CodeLines } from './code-lines';

/**
 * A standalone snippet — an install command, an import line. Not the demo panel: that one is
 * `agl-demo-code`, it has two tabs, and its content is cut out of a demo file.
 *
 * It takes either plain `code` or pre-tokenised `lines`, because the two snippets on this site
 * are not alike. The import line is composed and coloured at build time, so it arrives as
 * tokens. The install command is a shell command written into a template — there is no build
 * step that sees it, and an uncoloured terminal block is the ordinary way to show one anyway.
 *
 * ── Why Copy is always visible ────────────────────────────────────────────────────────────
 * It used to be `opacity-0 group-hover:opacity-100`, revealed on hover. Measured on an
 * emulated iPhone, `matchMedia('(hover: hover)')` is **false** — a touch device has no hover
 * at all — so all five buttons on the Getting started page sat at `opacity: 0`. Copying the
 * install command is the single thing that page exists for, and on a phone it was not there.
 *
 * The button now lives in the header row rather than floating over the code, which also ends
 * the overlap it used to have with the first line, and matches `agl-demo-code`. The row
 * renders even without a label, because a Copy button that appears only on some blocks is a
 * Copy button readers stop looking for.
 */
@Component({
    selector: 'agl-code-block',
    imports: [CodeLines],
    template: `
        <div class="overflow-hidden rounded-xl border border-line bg-sunken">
            <div class="flex items-center gap-2 border-b border-line px-3 py-1.5">
                <span class="truncate font-mono text-[11px] uppercase tracking-wider text-faint">{{ label() }}</span>
                <button type="button" class="ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted hover:text-ink" (click)="copy()">
                    <i class="pi text-[11px]" [class.pi-copy]="!copied()" [class.pi-check]="copied()"></i>
                    {{ copied() ? 'Copied' : 'Copy' }}
                </button>
            </div>

            @if (lines().length) {
                <agl-code-lines [lines]="lines()" [palette]="palette()" />
            } @else {
                <pre class="thin-scroll overflow-x-auto px-4 py-3 text-[13px] leading-relaxed"><code>{{ code() }}</code></pre>
            }
        </div>
    `
})
export class CodeBlock {
    readonly code = input('');

    readonly lines = input<CodeLine[]>([]);

    readonly palette = input<[string, string][]>([]);

    readonly label = input('');

    readonly copied = signal(false);

    /** Whichever form was supplied, as the text a reader gets on their clipboard. */
    private readonly text = computed(() =>
        this.lines().length
            ? this.lines()
                  .map((line) => line.map((token) => token.t).join(''))
                  .join('\n')
            : this.code()
    );

    copy(): void {
        navigator.clipboard?.writeText(this.text()).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        });
    }
}
