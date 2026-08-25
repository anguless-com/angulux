import { Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiIndexEntry, GuidePayload, loadApiIndex, loadGuide } from '../data';
import { CodeBlock } from '../components/code-block';
import { Toc, TocEntry } from '../components/toc';
import { DEMO_SECTIONS } from '../doc/registry';

/**
 * Every count on this page is computed from the corpus index, never typed in. The scope of
 * this fork is a number that has already been got wrong once by being written down, so the
 * site is built so that writing it down is not possible.
 */
@Component({
    selector: 'agl-home-page',
    standalone: true,
    imports: [RouterLink, CodeBlock, Toc],
    template: `
        <div class="mx-auto flex w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:px-10">
            <article class="min-w-0 max-w-3xl flex-1">
                <!-- ── hero ──────────────────────────────────────────────────────────── -->
                <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="rounded-full border border-brand/40 bg-brand-soft px-2.5 py-0.5 font-medium text-brand">MIT</span>
                    <span class="rounded-full border border-line px-2.5 py-0.5 text-muted">Angular 22</span>
                    <span class="rounded-full border border-line px-2.5 py-0.5 text-muted">Zoneless · standalone</span>
                </div>

                <h1 class="mt-5 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                    The PrimeNG components you already write, on Angular 22 and still MIT.
                </h1>

                <p class="mt-5 max-w-2xl text-pretty text-lg text-muted">
                    angulux is a fork of PrimeNG 21.1.9 — the last MIT release — maintained for Angular 22. {{ moduleCount() }} modules ship in the library, and every one of
                    them has an API reference here, generated from the same corpus that produces <a class="text-brand hover:underline" href="llms.txt">llms.txt</a>.
                </p>

                <!-- Get started first, browse second. A stranger who lands here needs a path
                     through installation before a component gallery means anything. -->
                <div class="mt-7 flex flex-wrap items-center gap-3">
                    <a class="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white no-underline hover:bg-brand-strong" routerLink="/getting-started">
                        Get started
                        <i class="pi pi-arrow-right text-[11px]"></i>
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
                        <i class="pi pi-github text-[13px]"></i>
                        GitHub
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
                    Only the first package is required — the next section explains why, and
                    <a class="text-brand hover:underline" routerLink="/getting-started">Getting started</a> has the three steps after this one.
                </p>
                <!-- The same snippet Getting started shows, from the same generated payload. Two
                     copies of an install command is how a site ends up telling a reader to install
                     one set of packages on one page and a different set on another. -->
                <agl-code-block [lines]="install()" [palette]="palette()" label="terminal" />

                <!-- ── licence boundary ──────────────────────────────────────────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="two-packages">Why there are two packages</h2>
                <!-- prime-names:attribution — nominative use, the same grant NOTICE relies on: naming a
                     third party in order to state factually where a dependency comes from and where its
                     MIT line ends. A reader deciding whether to adopt this library is owed that in the
                     place they are reading, not only in the repository. check:names allows brand PROSE
                     inside this region and nothing else. -->
                <p class="mt-3 text-[15px] text-muted">
                    angulux ships no theme presets of its own, so the preset comes from
                    <code class="code-chip">&#64;primeuix/themes</code> — PrimeTek's package, not ours. It is MIT through
                    <code class="code-chip">2.0.3</code>, and
                    <code class="code-chip">3.0.0</code> is the first commercial release. That release already exists and is
                    what the registry serves as <code class="code-chip">latest</code>, so the MIT line is closed rather than
                    merely paused.
                </p>
                <p class="mt-3 text-[15px] text-muted">
                    What that means in practice: angulux declares it as an <strong class="font-medium text-ink">optional</strong> peer ranged
                    <code class="code-chip">^2.0.0</code>, and installing angulux alone pulls in zero PrimeTek packages. Drop
                    the second package and <code class="code-chip">provideAngulux()</code> runs unstyled but works. Be clear
                    about what the range buys you, though — it is a <em>warning</em>, not a lock.
                    <code class="code-chip">npm install &#64;primeuix/themes&#64;3</code> still succeeds; it only prints a
                    resolution warning naming the range it broke. If that boundary matters to your legal review, pin the version exactly and run a licence check in your own
                    build.
                </p>
                <!-- prime-names:end -->

                <!-- ── migration honesty ─────────────────────────────────────────────── -->
                <h2 class="mt-14 scroll-mt-20 text-xl font-semibold tracking-tight" id="migrating">Coming from PrimeNG 21?</h2>
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
                            <span class="truncate text-ink">{{ module.name }}</span>
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

    private readonly guide = signal<GuidePayload | null>(null);

    readonly palette = computed(() => this.guide()?.palette ?? []);

    readonly install = computed(() => this.guide()?.snippets['install'] ?? []);

    readonly moduleCount = computed(() => this.modules().length);

    readonly documented = computed(() => this.modules().filter((module) => module.name in DEMO_SECTIONS));

    readonly documentedCount = computed(() => this.documented().length);

    readonly apiOnlyCount = computed(() => this.moduleCount() - this.documentedCount());

    /** Counted, not stated. The same registry the pages render from is the only place it lives. */
    readonly demoTotal = computed(() => this.documented().reduce((total, module) => total + this.demoCount(module.name), 0));

    /** Where "Browse the components" goes. First in corpus order, so it survives the list changing. */
    readonly firstDocumented = computed(() => this.documented()[0]?.name ?? '');

    readonly toc: TocEntry[] = [
        { id: 'install', label: 'Install' },
        { id: 'two-packages', label: 'Why two packages' },
        { id: 'migrating', label: 'Coming from PrimeNG 21' },
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
}
