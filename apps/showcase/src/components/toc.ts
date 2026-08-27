import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, PLATFORM_ID, effect, inject, input, signal } from '@angular/core';

export interface TocEntry {
    /** The `id` of the heading this links to. */
    id: string;
    label: string;
    /** Nested one level under the entry above it — a declaration inside the API section. */
    nested?: boolean;
}

/**
 * "On this page". A module page can run to a dozen headings and several thousand table rows —
 * `table` alone publishes six declarations — and without this the only way to reach the
 * outputs of the third declaration is to scroll past everything before it.
 *
 * The highlight is a nicety and is treated as one: it needs `IntersectionObserver`, which does
 * not exist while prerendering, so the links render on the server with nothing highlighted and
 * light up once the page is live. Nothing about the navigation depends on it.
 */
@Component({
    selector: 'agl-toc',
    template: `
        @if (entries().length) {
            <nav class="thin-scroll sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto border-l border-line py-1 pl-5">
                <div class="pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">On this page</div>
                @for (entry of entries(); track entry.id) {
                    <a
                        [href]="'#' + entry.id"
                        class="block truncate rounded py-1 text-[13px] leading-snug no-underline"
                        [class]="entry.nested ? 'pl-3' : ''"
                        [class.text-brand]="active() === entry.id"
                        [class.text-muted]="active() !== entry.id"
                        [class.hover:text-ink]="active() !== entry.id"
                    >
                        {{ entry.label }}
                    </a>
                }
            </nav>
        }
    `
})
export class Toc {
    readonly entries = input.required<TocEntry[]>();

    readonly active = signal('');

    constructor() {
        const browser = isPlatformBrowser(inject(PLATFORM_ID));
        const destroy = inject(DestroyRef);

        if (!browser) {
            return;
        }

        let observer: IntersectionObserver | null = null;

        destroy.onDestroy(() => observer?.disconnect());

        effect(() => {
            const entries = this.entries();

            observer?.disconnect();
            this.active.set('');

            if (!entries.length) {
                return;
            }

            // The headings do not exist yet on the frame the list changes — the page is
            // rendering them from the same data. One turn later they do.
            queueMicrotask(() => {
                const seen = new Map<string, boolean>();

                observer = new IntersectionObserver(
                    (records) => {
                        for (const record of records) {
                            seen.set(record.target.id, record.isIntersecting);
                        }

                        // The first heading currently on screen, in document order — not the
                        // most recently crossed, which jumps backwards when scrolling up.
                        this.active.set(entries.find((entry) => seen.get(entry.id))?.id ?? this.active());
                    },
                    // Bottom margin pulled well up so a heading counts as "current" while its
                    // section fills the viewport, rather than only while the heading itself is
                    // visible — which for a long API table is a few pixels of scrolling.
                    { rootMargin: '-72px 0px -70% 0px' }
                );

                for (const entry of entries) {
                    const element = document.getElementById(entry.id);

                    if (element) observer.observe(element);
                }
            });
        });
    }
}
