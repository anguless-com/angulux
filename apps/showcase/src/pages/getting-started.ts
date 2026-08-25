import { Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiIndexEntry, GuidePayload, loadApiIndex, loadGuide } from '../data';
import { CodeBlock } from '../components/code-block';
import { Toc, TocEntry } from '../components/toc';
import { DEMO_SECTIONS } from '../doc/registry';

/**
 * The page a stranger needs before any module page is useful.
 *
 * It is deliberately short and it ends by sending the reader somewhere else. Every snippet
 * here is hand-written — nothing extracts it from code that ran — whereas every snippet on a
 * module page is cut out of a component rendered directly above it. Where the two could
 * disagree, this page defers.
 */
@Component({
    selector: 'agl-getting-started-page',
    standalone: true,
    imports: [RouterLink, CodeBlock, Toc],
    template: `
        <div class="mx-auto flex w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:px-10">
            <article class="min-w-0 max-w-3xl flex-1">
                <div class="font-mono text-xs text-faint">guide</div>
                <h1 class="mt-1 text-3xl font-semibold tracking-tight">Getting started</h1>
                <p class="mt-2 text-[15px] text-muted">
                    Install, provide, use. Three steps, and then {{ moduleCount() }} modules behave the way the API reference on every module page says they do.
                </p>

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="install">1 · Install</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    <code class="code-chip">&#64;primeuix/themes</code> supplies the theme preset and <code class="code-chip">primeicons</code> the icon font. Both are
                    optional — see <a class="text-brand hover:underline" routerLink="/theming">Theming</a> for what you lose by dropping them.
                </p>
                <agl-code-block [lines]="snippet('install')" [palette]="palette()" label="terminal" />

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="provide">2 · Provide it</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    <code class="code-chip">provideAngulux()</code> once, at the application root. Nothing else is global.
                </p>
                <agl-code-block [lines]="snippet('provide')" [palette]="palette()" label="app.config.ts" />
                <p class="mt-4 text-sm text-muted">
                    <strong class="font-medium text-ink">Zoneless is not a requirement, it is what this is tested under.</strong> The library's spec suite and this entire site run
                    zoneless, so every demo you see is also a zoneless smoke test. If your application still uses zone.js, angulux works — it is simply the mode with less
                    evidence behind it.
                </p>

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="icons">3 · Add the icon stylesheet</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    Skip this and components still work; their icons render as empty boxes. The icon font is a plain stylesheet, so it goes in the builder's list rather than
                    through a provider.
                </p>
                <agl-code-block [lines]="snippet('styles')" [palette]="palette()" label="angular.json" />

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="use">4 · Use a component</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    Each module is its own entry point, so you import only what you render. The exact import line for any module is printed at the top of its page.
                </p>
                <agl-code-block [lines]="snippet('useComponent')" [palette]="palette()" label="order.ts" />
                <div class="mt-3">
                    <agl-code-block [lines]="snippet('use')" [palette]="palette()" label="order.html" />
                </div>

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="honest">What you are getting — and what you are not</h2>
                <p class="mt-3 text-[15px] text-muted">Worth knowing before you depend on this rather than after.</p>

                <div class="mt-4 space-y-3">
                    <div class="rounded-xl border border-line px-4 py-3">
                        <div class="text-sm font-medium text-ink">MIT, and the fork exists so it stays that way</div>
                        <p class="mt-1 text-sm text-muted">
                            angulux is a fork of PrimeNG 21.1.9 — the last MIT release — maintained for Angular 22. The theme package is a separate question and it has a real
                            edge: <a class="text-brand hover:underline" routerLink="/theming">Theming</a> is honest about it.
                        </p>
                    </div>
                    <div class="rounded-xl border border-line px-4 py-3">
                        <div class="text-sm font-medium text-ink">{{ moduleCount() }} modules, {{ documentedCount() }} of them with runnable demos</div>
                        <p class="mt-1 text-sm text-muted">
                            Every module has an API reference, generated from the same corpus that produces <a class="text-brand hover:underline" href="llms.txt">llms.txt</a>. The
                            modules without demos are infrastructure — there is nothing to render.
                        </p>
                    </div>
                    <div class="rounded-xl border border-caution/40 bg-caution-soft px-4 py-3">
                        <div class="text-sm font-medium text-caution">Server-side rendering: do not assume it works</div>
                        <p class="mt-1 text-sm text-caution/90">
                            This site is prerendered, so the library does render inside Node — but statically, with nobody clicking anything. The interactive paths have never been
                            exercised on a server, and a defect of exactly that kind was found and fixed only when prerendering was switched on. If you need SSR with hydration,
                            test your own screens before committing to it.
                        </p>
                    </div>
                </div>

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="next">Where to go next</h2>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" routerLink="/theming">
                        <div class="text-sm font-medium text-ink">Theming</div>
                        <div class="mt-0.5 text-xs text-muted">Presets, dark mode, and where the MIT line actually is.</div>
                    </a>
                    @if (firstDocumented(); as first) {
                        <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" [routerLink]="['/', first]">
                            <div class="text-sm font-medium text-ink">Browse the components</div>
                            <div class="mt-0.5 text-xs text-muted">{{ documentedCount() }} modules with demos you can copy.</div>
                        </a>
                    }
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" href="primeng-21-to-angular-22">
                        <div class="text-sm font-medium text-ink">Coming from PrimeNG 21?</div>
                        <div class="mt-0.5 text-xs text-muted">The options, most of which are not angulux.</div>
                    </a>
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" href="llms.txt">
                        <div class="text-sm font-medium text-ink">For assistants</div>
                        <div class="mt-0.5 text-xs text-muted">The whole API, machine-readable.</div>
                    </a>
                </div>
            </article>

            <aside class="hidden w-52 shrink-0 xl:block">
                <agl-toc [entries]="toc" />
            </aside>
        </div>
    `
})
export class GettingStartedPage {
    private readonly modules = signal<ApiIndexEntry[]>([]);

    private readonly guide = signal<GuidePayload | null>(null);

    readonly moduleCount = computed(() => this.modules().length);

    readonly documentedCount = computed(() => this.documented().length);

    readonly palette = computed(() => this.guide()?.palette ?? []);

    readonly toc: TocEntry[] = [
        { id: 'install', label: '1 · Install' },
        { id: 'provide', label: '2 · Provide it' },
        { id: 'icons', label: '3 · Icon stylesheet' },
        { id: 'use', label: '4 · Use a component' },
        { id: 'honest', label: 'What you are getting' },
        { id: 'next', label: 'Where to go next' }
    ];

    /**
     * The same join the home page and the nav make, against the same registry. Deriving it
     * from something cheaper — `declarationCount`, say — would produce a number that is not
     * "modules with demos" while being labelled as one, which is the defect this site has
     * already shipped twice from two different renderers.
     */
    private readonly documented = computed(() => this.modules().filter((module) => module.name in DEMO_SECTIONS));

    readonly firstDocumented = computed(() => this.documented()[0]?.name ?? '');

    constructor() {
        const pending = inject(PendingTasks);

        pending.run(async () => this.modules.set(await loadApiIndex()));
        pending.run(async () => this.guide.set(await loadGuide()));
    }

    snippet(id: string) {
        return this.guide()?.snippets[id] ?? [];
    }
}
