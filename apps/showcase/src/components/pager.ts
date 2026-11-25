import { Component, PendingTasks, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiIndexEntry, loadApiIndex } from '../data';
import { readingOrder } from '../nav';

/**
 * Previous and next, at the foot of a page, in the order the sidebar lists the pages.
 *
 * The order comes from `readingOrder()` in nav.ts, the same function behind the sidebar, so the
 * two cannot disagree. The index it needs is the one the shell has already loaded; loading it
 * here as a pending task is what puts the links into the prerendered HTML.
 */
@Component({
    selector: 'agl-pager',
    imports: [RouterLink],
    template: `
        @if (neighbours(); as n) {
            <nav class="mt-16 grid gap-3 border-t border-line pt-6 sm:grid-cols-2" aria-label="Previous and next page">
                @if (n.previous; as previous) {
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" [routerLink]="previous.path" rel="prev">
                        <div class="text-xs text-muted">Previous</div>
                        <div class="mt-0.5 text-sm font-medium text-ink">{{ previous.label }}</div>
                    </a>
                } @else {
                    <span class="hidden sm:block"></span>
                }
                @if (n.next; as next) {
                    <a class="rounded-xl border border-line px-4 py-3 text-right no-underline hover:border-brand hover:bg-surface" [routerLink]="next.path" rel="next">
                        <div class="text-xs text-muted">Next</div>
                        <div class="mt-0.5 text-sm font-medium text-ink">{{ next.label }}</div>
                    </a>
                }
            </nav>
        }
    `
})
export class Pager {
    /** The page this pager sits on, as its path: `/theming`, `/datepicker`. */
    readonly path = input.required<string>();

    private readonly index = signal<ApiIndexEntry[] | null>(null);

    readonly neighbours = computed(() => {
        const index = this.index();

        if (!index) return null;

        const order = readingOrder(index);
        const at = order.findIndex((page) => page.path === this.path());

        return at === -1 ? null : { previous: order[at - 1], next: order[at + 1] };
    });

    constructor() {
        inject(PendingTasks).run(async () => this.index.set(await loadApiIndex()));
    }
}
