import { Component, ElementRef, afterRenderEffect, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { loadSearchIndex } from '../data';
import { EntryKind, SearchEntry, search, searchEntries } from './search-entries';

const KIND_LABEL: Record<EntryKind, string> = {
    page: 'Guide',
    module: 'Module',
    component: 'Component',
    directive: 'Directive',
    input: 'Input',
    output: 'Output',
    slot: 'Slot'
};

/**
 * Search across the site: pages, modules, components and directives, and every input, output
 * and slot, by name.
 *
 * Loaded only when someone first opens search (the shell wraps it in a defer block), and its
 * index is fetched then too, so no page pays for it on load.
 *
 * A native `<dialog>` opened with `showModal()`: the browser makes the rest of the page inert,
 * keeps focus inside, closes it on Escape, and puts focus back where it was. The field is a combobox over a listbox, with
 * the highlighted result named by `aria-activedescendant`, so focus stays in the field while
 * the arrow keys move through the results.
 */
@Component({
    selector: 'agl-search-dialog',
    template: `
        <dialog
            #dialog
            class="m-auto mt-[10vh] w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-line bg-canvas p-0 text-ink shadow-2xl backdrop:bg-ink/30"
            aria-label="Search the documentation"
            closedby="any"
            (close)="onClose()"
        >
            <!-- The site has no Preflight (styles.css says why), so the field and the list reset
                 the browser's own border, margin and padding here. The row's bottom edge takes
                 the brand colour while the field has focus, in place of an outline. -->
            <div class="flex items-center gap-2 border-b-2 border-line px-4 focus-within:border-brand">
                <i class="pi pi-search text-sm text-faint" aria-hidden="true"></i>
                <input
                    #field
                    type="text"
                    class="h-12 min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-ink outline-none placeholder:text-faint"
                    placeholder="Search modules, components, inputs, outputs, slots"
                    role="combobox"
                    aria-label="Search"
                    aria-autocomplete="list"
                    aria-controls="agl-search-results"
                    [attr.aria-expanded]="results().length > 0"
                    [attr.aria-activedescendant]="results().length ? 'agl-search-option-' + active() : null"
                    [value]="query()"
                    (input)="onInput($any($event.target).value)"
                    (keydown)="onKeydown($event)"
                    autocomplete="off"
                    spellcheck="false"
                />
                <!-- A phone has no Escape key, so closing has to be something to tap. -->
                <button type="button" class="h-7 rounded border border-line px-1.5 font-mono text-[11px] text-muted hover:text-ink" aria-label="Close search, esc" (click)="close()">esc</button>
            </div>

            <ul id="agl-search-results" role="listbox" aria-label="Results" class="thin-scroll m-0 max-h-[min(60vh,28rem)] list-none overflow-y-auto p-2" [class.hidden]="!results().length">
                @for (result of results(); track $index) {
                    <li
                        [id]="'agl-search-option-' + $index"
                        role="option"
                        [attr.aria-selected]="$index === active()"
                        tabindex="-1"
                        class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2"
                        [class.bg-brand-soft]="$index === active()"
                        (click)="go(result)"
                        (keydown.enter)="go(result)"
                        (mousemove)="active.set($index)"
                    >
                        <span class="w-20 shrink-0 text-[11px] uppercase tracking-wider text-muted">{{ kindLabel[result.kind] }}</span>
                        <span class="min-w-0 flex-1">
                            <span class="block truncate font-medium" [class.font-mono]="result.kind === 'input' || result.kind === 'output' || result.kind === 'slot'">{{ result.label }}</span>
                            <span class="block truncate text-xs text-muted">{{ result.context }}</span>
                        </span>
                    </li>
                }
            </ul>

            <p class="px-4 py-6 text-sm text-muted" role="status" [class.hidden]="results().length">
                @if (!entries()) {
                    Loading the index…
                } @else if (query().trim()) {
                    Nothing is named “{{ query().trim() }}”.
                } @else {
                    Every module, component and directive, and each of their {{ memberCount() }} inputs, outputs and slots, by name.
                }
            </p>
        </dialog>
    `
})
export class SearchDialog {
    readonly open = input.required<boolean>();

    readonly closed = output<void>();

    readonly kindLabel = KIND_LABEL;

    readonly query = signal('');

    readonly active = signal(0);

    readonly entries = signal<SearchEntry[] | null>(null);

    readonly results = computed(() => search(this.entries() ?? [], this.query()));

    readonly memberCount = computed(() => (this.entries() ?? []).filter((e) => e.kind === 'input' || e.kind === 'output' || e.kind === 'slot').length.toLocaleString('en'));

    private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

    private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

    private readonly router = inject(Router);

    constructor() {
        loadSearchIndex().then((index) => this.entries.set(searchEntries(index)));

        afterRenderEffect(() => {
            const dialog = this.dialog().nativeElement;

            if (this.open() && !dialog.open) {
                dialog.showModal();
                this.field().nativeElement.select();
            } else if (!this.open() && dialog.open) {
                dialog.close();
            }
        });

        // The highlighted result stays in view while the arrow keys move it.
        afterRenderEffect(() => {
            document.getElementById(`agl-search-option-${this.active()}`)?.scrollIntoView({ block: 'nearest' });
        });
    }

    onInput(value: string): void {
        this.query.set(value);
        this.active.set(0);
    }

    onKeydown(event: KeyboardEvent): void {
        const count = this.results().length;

        if (event.key === 'ArrowDown' && count) {
            event.preventDefault();
            this.active.update((i) => (i + 1) % count);
        } else if (event.key === 'ArrowUp' && count) {
            event.preventDefault();
            this.active.update((i) => (i - 1 + count) % count);
        } else if (event.key === 'Enter' && count) {
            event.preventDefault();
            this.go(this.results()[this.active()]);
        }
    }

    go(result: SearchEntry): void {
        this.dialog().nativeElement.close();
        this.router.navigate([result.path], { fragment: result.fragment });
    }

    /**
     * The close button. A click on the backdrop also closes the dialog where the browser supports
     * `closedby="any"`; where it does not, Escape and this button do.
     */
    close(): void {
        this.dialog().nativeElement.close();
    }

    /**
     * Focus goes back to whatever opened the dialog without code here: closing a modal dialog
     * restores the previously focused element, and the spec checks that it does.
     */
    onClose(): void {
        this.closed.emit();
    }
}
