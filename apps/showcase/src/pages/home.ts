import { Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiIndexEntry, GuidePayload, loadApiIndex, loadGuide } from '../data';
import { InstallCommand } from '../components/install-command';
import { Toc, TocEntry } from '../components/toc';
import { DEMO_SECTIONS } from '../doc/registry';
import { moduleTitle } from '../nav';
import { HomePreview } from './home-preview';

/**
 * Every count on this page is computed from the corpus index, never typed in. The scope of
 * this fork is a number that has already been got wrong once by being written down, so the
 * site is built so that writing it down is not possible.
 */
@Component({
    selector: 'agl-home-page',
    imports: [RouterLink, InstallCommand, Toc, HomePreview],
    template: `
        <div class="mx-auto flex w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:px-10">
            <article class="min-w-0 max-w-3xl flex-1">
                <!-- ── hero ──────────────────────────────────────────────────────────── -->
                <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="rounded-full border border-brand/40 bg-brand-soft px-2.5 py-0.5 font-medium text-brand">MIT</span>
                    <span class="rounded-full border border-line px-2.5 py-0.5 text-muted">Angular 22</span>
                    <span class="rounded-full border border-line px-2.5 py-0.5 text-muted">Zoneless · standalone</span>
                    <span class="rounded-full border border-line px-2.5 py-0.5 text-muted">WCAG AA theme</span>
                </div>

                <h1 class="mt-5 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                    Components for Angular&nbsp;22 that stay MIT.
                </h1>

                <p class="mt-5 max-w-2xl text-pretty text-lg text-muted">
                    {{ moduleCount() }} modules, two presets of our own whose text meets WCAG AA, and an API reference for every module, generated from the source code
                    by the same build that writes <a class="text-brand hover:underline" href="llms.txt">llms.txt</a>.
                </p>

                <!-- Get started first, browse second. A stranger who lands here needs a path
                     through installation before a component gallery means anything. -->
                <div class="mt-7 flex flex-wrap items-center gap-3">
                    <a class="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-canvas no-underline hover:bg-brand-strong" routerLink="/getting-started">
                        Get started
                        <i class="pi pi-arrow-right text-[11px]" aria-hidden="true"></i>
                    </a>
                    @if (firstDocumented(); as first) {
                        <a
                            class="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink no-underline hover:bg-surface"
                            [routerLink]="['/', first]"
                        >
                            Browse the components
                        </a>
                    }
                    <a
                        class="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink no-underline hover:bg-surface"
                        href="https://github.com/anguless-com/angulux"
                    >
                        <i class="pi pi-github text-[13px]" aria-hidden="true"></i>
                        GitHub
                    </a>
                </div>

                <!-- ── the components, before anything is said about them ─────────────── -->
                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="preview">See it</h2>
                <!-- The preview starts inside the first screen of a phone, so a viewport trigger would
                     load its code at once. Instead it is server-rendered in full and stays as that
                     markup until a pointer or focus reaches it: hover covers mouseover and focusin,
                     and a tap produces a mouseover too. The placeholder is only for arriving here
                     from another page of the site, which renders on the client. -->
                @defer (on viewport; hydrate on hover) {
                    <agl-home-preview class="mt-3" />
                } @placeholder {
                    <div class="mt-3 min-h-[70rem] rounded-xl border border-line sm:min-h-[51rem]" aria-hidden="true"></div>
                }

                <!-- ── what sets it apart, each with the place it is proven ───────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="why">Why angulux</h2>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" href="https://github.com/anguless-com/angulux/tree/main/packages/angulux-license-guard">
                        <div class="text-sm font-medium text-ink">MIT, checked on every build</div>
                        <div class="mt-1 text-sm text-muted">The build fails if a dependency under a commercial licence enters the tree. The check is published on its own, as angulux-license-guard.</div>
                    </a>
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" routerLink="/theming" fragment="contrast">
                        <div class="text-sm font-medium text-ink">Accessibility that is measured</div>
                        <div class="mt-1 text-sm text-muted">The text contrast of every severity colour, in both schemes, and an axe sweep of every page on this site run in a browser on every build.</div>
                    </a>
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" routerLink="/getting-started">
                        <div class="text-sm font-medium text-ink">Written for Angular 22</div>
                        <div class="mt-1 text-sm text-muted">Zoneless and standalone, and tested that way. Every form control compiles with Signal Forms' formField, checked against the built package in CI.</div>
                    </a>
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" href="llms.txt">
                        <div class="text-sm font-medium text-ink">Readable by assistants</div>
                        <div class="mt-1 text-sm text-muted">llms.txt, the whole API in one file, and a Markdown page per module, all generated from the same source as these pages.</div>
                    </a>
                </div>

                <!-- ── the numbers, all computed ──────────────────────────────────────── -->
                <dl class="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
                    <div class="bg-canvas px-4 py-3">
                        <dt class="text-xs text-muted">Modules</dt>
                        <dd class="mt-0.5 text-2xl font-semibold tracking-tight">{{ moduleCount() }}</dd>
                    </div>
                    <div class="bg-canvas px-4 py-3">
                        <dt class="text-xs text-muted">With demos</dt>
                        <dd class="mt-0.5 text-2xl font-semibold tracking-tight">{{ documentedCount() }}</dd>
                    </div>
                    <div class="bg-canvas px-4 py-3">
                        <dt class="text-xs text-muted">Runnable demos</dt>
                        <dd class="mt-0.5 text-2xl font-semibold tracking-tight">{{ demoTotal() }}</dd>
                    </div>
                    <div class="bg-canvas px-4 py-3">
                        <dt class="text-xs text-muted">Licence</dt>
                        <dd class="mt-0.5 text-2xl font-semibold tracking-tight text-brand">MIT</dd>
                    </div>
                </dl>

                <!-- ── install ───────────────────────────────────────────────────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="install">Install</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    Only the first package is required — the section after this one explains why, and
                    <a class="text-brand hover:underline" routerLink="/getting-started">Getting started</a> has the three steps after this one.
                </p>
                <!-- The same snippet Getting started shows, from the same generated payload. Two
                     copies of an install command is how a site ends up telling a reader to install
                     one set of packages on one page and a different set on another. -->
                <agl-install-command [guide]="guide()" />

                <!-- ── licence boundary ──────────────────────────────────────────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="two-packages">Components and themes</h2>
                <p class="mt-3 text-[15px] text-muted">
                    <code class="code-chip">&#64;anguless/angulux</code> is the components and <code class="code-chip">&#64;anguless/angulux-themes</code> is how they look.
                    Both are MIT and published by this project. Leave the second one out and <code class="code-chip">provideAngulux()</code> still works; the components render
                    unstyled.
                </p>
                <p class="mt-3 text-[15px] text-muted">
                    Lux is the default preset and Lux Compact the denser one. <a class="text-brand hover:underline" routerLink="/theming">Theming</a> shows both, how to
                    make one in your brand's colours, and what to check before you use a preset from another package.
                </p>

                <!-- ── migration honesty ─────────────────────────────────────────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="migrating">Migrating from PrimeNG 21</h2>
                <p class="mt-3 text-[15px] text-muted">
                    There is a page for that, and it is honest about the options — most of which are not angulux:
                    <a class="text-brand hover:underline" href="primeng-21-to-angular-22">PrimeNG 21 to Angular 22</a>.
                </p>

                <!-- ── machine-readable ──────────────────────────────────────────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="assistants">For assistants</h2>
                <p class="mt-3 text-[15px] text-muted">The whole API is published in machine-readable form, from the same corpus that renders the tables on every module page.</p>
                <div class="mt-4 grid gap-3 sm:grid-cols-3">
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" href="llms.txt">
                        <div class="font-mono text-sm text-ink">llms.txt</div>
                        <div class="mt-0.5 text-xs text-muted">The index — every module, one line each.</div>
                    </a>
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" href="llms-full.txt">
                        <div class="font-mono text-sm text-ink">llms-full.txt</div>
                        <div class="mt-0.5 text-xs text-muted">Everything, in one file.</div>
                    </a>
                    <a class="rounded-xl border border-line px-4 py-3 no-underline hover:border-brand hover:bg-surface" href="button.md">
                        <div class="font-mono text-sm text-ink">&lt;module&gt;.md</div>
                        <div class="mt-0.5 text-xs text-muted">One Markdown page per module.</div>
                    </a>
                </div>

                <!-- ── the module grid ───────────────────────────────────────────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="modules">Modules with demos</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    {{ documentedCount() }} of {{ moduleCount() }} so far. The other {{ apiOnlyCount() }} have a complete API reference and no demos yet.
                </p>
                <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    @for (module of documented(); track module.name) {
                        <a
                            class="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm no-underline hover:border-brand hover:bg-surface"
                            [routerLink]="['/', module.name]"
                        >
                            <span class="truncate text-ink">{{ label(module) }}</span>
                            <span class="shrink-0 rounded-full bg-brand-soft px-1.5 text-[11px] text-brand">{{ demoCount(module.name) }}</span>
                        </a>
                    }
                </div>

                <!-- ── attribution ───────────────────────────────────────────────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="attribution">Attribution</h2>
                <!-- prime-names:attribution — the MIT notice angulux is obliged to retain, plus the
                     nominative-use statement from NOTICE. check:names allows brand PROSE here, and
                     nothing else: a selector, an import or a branded API name still fails inside. -->
                <p class="mt-3 text-sm text-muted">
                    angulux is derived from PrimeNG 21.1.9 and primeuix, both MIT, Copyright (c) 2016-2026 PrimeTek. The demos on this site are derived from the PrimeNG showcase
                    at that same release. The original licence and notice are retained in the repository, and every upstream commit SHA is recorded in
                    <code class="code-chip">PROVENANCE.md</code>.
                </p>
                <p class="mt-3 text-sm text-muted">
                    angulux is not affiliated with, endorsed by, or sponsored by PrimeTek. "PrimeNG" and "PrimeTek" are trademarks of their respective owners and appear here only
                    to state factually where this code came from. "Angular" is a trademark of Google LLC.
                </p>
                <!-- prime-names:end -->
            </article>

            <aside class="hidden w-52 shrink-0 xl:block">
                <agl-toc [entries]="toc" />
            </aside>
        </div>
    `
})
export class HomePage {
    private readonly modules = signal<ApiIndexEntry[]>([]);

    readonly guide = signal<GuidePayload | null>(null);

    readonly moduleCount = computed(() => this.modules().length);

    readonly documented = computed(() => this.modules().filter((module) => module.name in DEMO_SECTIONS));

    readonly documentedCount = computed(() => this.documented().length);

    readonly apiOnlyCount = computed(() => this.moduleCount() - this.documentedCount());

    /** Counted, not stated. The same registry the pages render from is the only place it lives. */
    readonly demoTotal = computed(() => this.documented().reduce((total, module) => total + this.demoCount(module.name), 0));

    /** Where "Browse the components" goes. First in corpus order, so it survives the list changing. */
    readonly firstDocumented = computed(() => this.documented()[0]?.name ?? '');

    readonly toc: TocEntry[] = [
        { id: 'preview', label: 'See it' },
        { id: 'why', label: 'Why angulux' },
        { id: 'install', label: 'Install' },
        { id: 'two-packages', label: 'Components and themes' },
        { id: 'migrating', label: 'Migrating from PrimeNG 21' },
        { id: 'assistants', label: 'For assistants' },
        { id: 'modules', label: 'Modules with demos' },
        { id: 'attribution', label: 'Attribution' }
    ];

    constructor() {
        const pending = inject(PendingTasks);

        pending.run(async () => this.modules.set(await loadApiIndex()));
        pending.run(async () => this.guide.set(await loadGuide()));
    }

    demoCount(name: string): number {
        return DEMO_SECTIONS[name]?.length ?? 0;
    }

    /** The name the sidebar gives the module (nav.ts). */
    label(module: ApiIndexEntry): string {
        return moduleTitle(module) ?? module.name;
    }
}
