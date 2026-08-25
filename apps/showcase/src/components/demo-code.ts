import { Component, computed, input, signal } from '@angular/core';
import { Demo } from '../data';

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

            <pre class="thin-scroll overflow-x-auto p-4 text-[13px] leading-relaxed"><code>{{ text() }}</code></pre>
        </div>
    `
})
export class DemoCode {
    readonly demo = input.required<Demo>();

    readonly tab = signal<'template' | 'source'>('template');

    readonly copied = signal(false);

    readonly text = computed(() => (this.tab() === 'template' ? this.demo().template : this.demo().source));

    copy(): void {
        navigator.clipboard?.writeText(this.text()).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        });
    }
}
