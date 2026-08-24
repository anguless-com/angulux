import { Component, computed, input, signal } from '@angular/core';
import { Demo } from '../data';

/**
 * Shows the code behind the demo directly above it. Both tabs are extracted from the demo
 * file at build time — neither is transcribed — so what is displayed here cannot drift away
 * from what just rendered.
 */
@Component({
    selector: 'agl-demo-code',
    standalone: true,
    template: `
        <div class="code">
            <div class="code-tabs">
                <button type="button" class="code-tab" [class.active]="tab() === 'template'" (click)="tab.set('template')">Template</button>
                <button type="button" class="code-tab" [class.active]="tab() === 'source'" (click)="tab.set('source')">Component</button>
                <button type="button" class="code-tab code-copy" (click)="copy()">{{ copied() ? 'Copied' : 'Copy' }}</button>
            </div>
            <pre><code>{{ text() }}</code></pre>
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
