import { Component, ElementRef, PendingTasks, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApiIndexEntry, LibraryVersion, loadApiIndex, loadVersion } from './data';
import { DEMO_SECTIONS } from './doc/registry';
import { ColorSchemeToggle } from './theme';

/**
 * The shell: a header, a filterable module list, and the routed page.
 *
 * Its nav is built from the corpus index, not from a hand-kept list — so a module cannot be
 * in the library and missing from the site, which is the failure a hand-kept nav produces
 * every time and never announces.
 *
 * The filter is not decoration. Sixty-four entries is past the point where a reader scans a
 * list, and the site has no search index; narrowing by name is the honest version of the
 * feature, and the placeholder says so rather than implying full-text search.
 */
@Component({
    selector: 'agl-showcase-root',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    host: {
        '(document:keydown)': 'onKeydown($event)'
    },
    template: `
        <header class="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
            <div class="mx-auto flex h-14 max-w-[100rem] items-center gap-3 px-4 lg:px-6">
                <button
                    type="button"
                    class="-ml-1 grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink lg:hidden"
                    [attr.aria-expanded]="navOpen()"
                    aria-controls="agl-nav"
                    aria-label="Toggle navigation"
                    (click)="navOpen.set(!navOpen())"
                >
                    <i class="pi" [class.pi-bars]="!navOpen()" [class.pi-times]="navOpen()"></i>
                </button>

                <a routerLink="/" class="flex items-center gap-2.5 text-ink no-underline">
                    <svg viewBox="0 0 24 24" class="size-6 shrink-0" aria-hidden="true">
                        <path d="M12 2 3 6v8c0 4 3.6 6.9 9 8 5.4-1.1 9-4 9-8V6Z" fill="none" stroke="currentColor" stroke-width="1.6" class="text-brand" />
                        <path d="m8.4 15.5 3.6-8 3.6 8M9.9 13h4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                    </svg>
                    <span class="text-[15px] font-semibold tracking-tight">angulux</span>
                </a>

                @if (version(); as version) {
                    @if (version.released) {
                        <span class="hidden rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-muted sm:inline" title="The release this site documents">
                            v{{ version.released }}
                        </span>
                        @if (version.unreleased) {
                            <span class="hidden rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand md:inline" title="Commits on main touching the published package since that tag">
                                +{{ version.unreleased }} unreleased
                            </span>
                        }
                    }
                }

                <div class="ml-auto flex items-center gap-1">
                    <a href="llms.txt" class="hidden rounded-lg px-2.5 py-1.5 text-sm text-muted no-underline hover:bg-surface hover:text-ink md:block">llms.txt</a>
                    <a
                        href="https://www.npmjs.com/package/&#64;anguless/angulux"
                        class="hidden rounded-lg px-2.5 py-1.5 text-sm text-muted no-underline hover:bg-surface hover:text-ink sm:block"
                    >
                        npm
                    </a>
                    <a
                        href="https://github.com/anguless-com/angulux"
                        aria-label="GitHub repository"
                        class="grid size-9 place-items-center rounded-lg text-muted no-underline hover:bg-surface hover:text-ink"
                    >
                        <i class="pi pi-github"></i>
                    </a>
                    <button
                        type="button"
                        class="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                        [attr.aria-label]="theme.scheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                        (click)="theme.toggle()"
                    >
                        <i class="pi" [class.pi-moon]="theme.scheme() === 'light'" [class.pi-sun]="theme.scheme() === 'dark'"></i>
                    </button>
                </div>
            </div>
        </header>

        <div class="mx-auto flex max-w-[100rem]">
            <!-- Backdrop for the slide-over. Only reachable below lg, where the sidebar covers
                 the page rather than sitting beside it. -->
            @if (navOpen()) {
                <div class="fixed inset-0 top-14 z-30 bg-ink/20 lg:hidden" (click)="navOpen.set(false)"></div>
            }

            <aside
                id="agl-nav"
                class="thin-scroll fixed bottom-0 left-0 top-14 z-30 w-72 shrink-0 overflow-y-auto border-r border-line bg-canvas px-3 pb-16 lg:sticky lg:bottom-auto lg:block lg:h-[calc(100dvh-3.5rem)]"
                [class.hidden]="!navOpen()"
            >
                <div class="sticky top-0 z-10 -mx-3 bg-canvas px-3 pb-3 pt-4">
                    <div class="relative">
                        <i class="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-faint"></i>
                        <input
                            #filterBox
                            type="search"
                            class="w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-9 text-sm text-ink outline-none placeholder:text-faint focus:border-brand focus:bg-canvas"
                            [attr.placeholder]="'Filter ' + modules().length + ' modules'"
                            [value]="query()"
                            (input)="query.set($any($event.target).value)"
                        />
                        <kbd class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-faint">/</kbd>
                    </div>
                </div>

                @if (matchCount() === 0) {
                    <p class="px-2 py-6 text-sm text-muted">No module matches “{{ query() }}”.</p>
                }

                @if (withDemos().length) {
                    <div class="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-faint">With demos · {{ withDemos().length }}</div>
                    @for (module of withDemos(); track module.name) {
                        <a
                            class="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-ink no-underline hover:bg-surface"
                            [routerLink]="['/', module.name]"
                            routerLinkActive="bg-brand-soft! text-brand! font-medium"
                            (click)="navOpen.set(false)"
                        >
                            <span class="truncate">{{ module.name }}</span>
                            <span class="shrink-0 rounded-full border border-line px-1.5 text-[11px] text-muted">{{ demoCount(module.name) }}</span>
                        </a>
                    }
                }

                @if (apiOnly().length) {
                    <div class="px-2 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-faint">API only · {{ apiOnly().length }}</div>
                    @for (module of apiOnly(); track module.name) {
                        <a
                            class="block truncate rounded-lg px-2 py-1.5 text-sm text-muted no-underline hover:bg-surface hover:text-ink"
                            [routerLink]="['/', module.name]"
                            routerLinkActive="bg-brand-soft! text-brand! font-medium"
                            (click)="navOpen.set(false)"
                        >
                            {{ module.name }}
                        </a>
                    }
                }
            </aside>

            <main class="min-w-0 flex-1">
                <router-outlet />
            </main>
        </div>
    `
})
export class AppComponent {
    private readonly modulesAll = signal<ApiIndexEntry[]>([]);

    private readonly filterBox = viewChild<ElementRef<HTMLInputElement>>('filterBox');

    readonly theme = inject(ColorSchemeToggle);

    readonly version = signal<LibraryVersion | null>(null);

    readonly navOpen = signal(false);

    readonly query = signal('');

    readonly modules = computed(() => this.modulesAll());

    private readonly matching = computed(() => {
        const query = this.query().trim().toLowerCase();

        return query ? this.modulesAll().filter((module) => module.name.toLowerCase().includes(query)) : this.modulesAll();
    });

    readonly matchCount = computed(() => this.matching().length);

    readonly withDemos = computed(() => this.matching().filter((module) => module.name in DEMO_SECTIONS));

    readonly apiOnly = computed(() => this.matching().filter((module) => !(module.name in DEMO_SECTIONS)));

    constructor() {
        // Declared to Angular, not merely started. Prerendering serialises as soon as the
        // application is stable, and a bare promise is invisible to that check — the nav would
        // be rendered empty into every one of the 65 pages.
        const pending = inject(PendingTasks);

        pending.run(async () => this.modulesAll.set(await loadApiIndex()));
        pending.run(async () => this.version.set(await loadVersion()));

        // A slide-over that survives navigation covers the page the reader just asked for.
        inject(Router)
            .events.pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe(() => this.navOpen.set(false));
    }

    demoCount(name: string): number {
        return DEMO_SECTIONS[name]?.length ?? 0;
    }

    /**
     * `/` focuses the filter — the convention on every documentation site that has one, and
     * the reason the key is printed in the box.
     *
     * Ignored while the reader is typing somewhere else, or `/` would be unusable in the
     * filter itself and in any text input a demo renders.
     */
    onKeydown(event: KeyboardEvent): void {
        if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }

        const active = event.target as HTMLElement | null;

        if (active && (active.isContentEditable || /^(input|textarea|select)$/i.test(active.tagName))) {
            return;
        }

        const box = this.filterBox()?.nativeElement;

        if (box) {
            event.preventDefault();
            this.navOpen.set(true);
            box.focus();
        }
    }
}
