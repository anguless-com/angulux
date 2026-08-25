import { Component, input, signal } from '@angular/core';

/**
 * A standalone snippet — an install command, an import line. Not the demo panel: that one is
 * `agl-demo-code`, it has two tabs, and its content is extracted from a file rather than
 * written into a template.
 *
 * The copy button is the point. Both places this appears exist to be pasted somewhere.
 */
@Component({
    selector: 'agl-code-block',
    standalone: true,
    template: `
        <div class="group relative overflow-hidden rounded-xl border border-line bg-sunken">
            @if (label()) {
                <div class="border-b border-line px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">{{ label() }}</div>
            }
            <pre class="thin-scroll overflow-x-auto px-4 py-3 text-[13px] leading-relaxed"><code>{{ code() }}</code></pre>
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
    readonly code = input.required<string>();

    readonly label = input('');

    readonly copied = signal(false);

    copy(): void {
        navigator.clipboard?.writeText(this.code()).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        });
    }
}
