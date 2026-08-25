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
 * The copy button is the point. Both of these exist to be pasted somewhere.
 */
@Component({
    selector: 'agl-code-block',
    standalone: true,
    imports: [CodeLines],
    template: `
        <div class="group relative overflow-hidden rounded-xl border border-line bg-sunken">
            @if (label()) {
                <div class="border-b border-line px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">{{ label() }}</div>
            }

            @if (lines().length) {
                <agl-code-lines [lines]="lines()" [palette]="palette()" />
            } @else {
                <pre class="thin-scroll overflow-x-auto px-4 py-3 text-[13px] leading-relaxed"><code>{{ code() }}</code></pre>
            }

            <button
                type="button"
                class="absolute right-2 top-2 rounded-md border border-line bg-canvas px-2 py-1 text-[11px] text-muted opacity-0 focus:opacity-100 group-hover:opacity-100 hover:text-ink"
                [class.top-10]="label()"
                (click)="copy()"
            >
                <i class="pi text-[10px]" [class.pi-copy]="!copied()" [class.pi-check]="copied()"></i>
                {{ copied() ? 'Copied' : 'Copy' }}
            </button>
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
