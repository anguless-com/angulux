import { Component, computed, input, signal } from '@angular/core';
import { CodeLine, Demo } from '../data';
import { CodeLines } from './code-lines';

/**
 * Shows the code behind the demo directly above it. Both tabs are extracted from the demo
 * file at build time — neither is transcribed — so what is displayed here cannot drift away
 * from what just rendered.
 *
 * It is drawn as the lower half of the demo panel: the card above rounds only its top corners
 * and this rounds only its bottom, so the running component and its source read as one object
 * rather than two that happen to be adjacent.
 */
@Component({
    selector: 'agl-demo-code',
    standalone: true,
    imports: [CodeLines],
    template: `
        <div class="overflow-hidden rounded-b-xl border border-t-0 border-line bg-sunken">
            <div class="flex items-center gap-1 border-b border-line px-2 py-1.5">
                <button
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs"
                    [class]="tab() === 'template' ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink'"
                    (click)="tab.set('template')"
                >
                    Template
                </button>
                <button
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs"
                    [class]="tab() === 'source' ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink'"
                    (click)="tab.set('source')"
                >
                    Component
                </button>

                <button type="button" class="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted hover:text-ink" (click)="copy()">
                    <i class="pi text-[11px]" [class.pi-copy]="!copied()" [class.pi-check]="copied()"></i>
                    {{ copied() ? 'Copied' : 'Copy' }}
                </button>
            </div>

            <agl-code-lines [lines]="lines()" [palette]="palette()" />
        </div>
    `
})
export class DemoCode {
    readonly demo = input.required<Demo>();

    /** The colours its tokens index into. One palette per module, shipped with the demos. */
    readonly palette = input.required<[string, string][]>();

    readonly tab = signal<'template' | 'source'>('template');

    readonly copied = signal(false);

    readonly lines = computed<CodeLine[]>(() => (this.tab() === 'template' ? this.demo().template : this.demo().source));

    /**
     * The original text, rebuilt from the tokens it was cut into.
     *
     * The payload ships no second copy of the source, so this is the only place the plain text
     * exists — and it is exact rather than approximately exact: the build step refuses to emit
     * tokens that do not reassemble into the file character for character, so a mismatch fails
     * the build instead of landing on a reader's clipboard.
     */
    copy(): void {
        const text = this.lines()
            .map((line) => line.map((token) => token.t).join(''))
            .join('\n');

        navigator.clipboard?.writeText(text).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        });
    }
}
