import { Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GuidePayload, loadGuide } from '../data';
import { CodeBlock } from '../components/code-block';
import { Toc, TocEntry } from '../components/toc';

/**
 * How the components get their looks, and where the licence line is.
 *
 * The second half is the reason this page exists as much as the first. angulux is MIT and says
 * so loudly; the preset package belongs to a third party and its MIT line is closed. A reader
 * evaluating this library will find that out in ten minutes, so the only useful thing to do is
 * say it here, in full, with the mitigation next to it.
 *
 * The brand names that statement needs live in the template, inside declared
 * `prime-names:attribution` regions. They may NOT appear in this comment: JSDoc leaks into
 * IntelliSense, so `check:names` treats it as API surface rather than prose, and it is right to.
 */
@Component({
    selector: 'agl-theming-page',
    standalone: true,
    imports: [RouterLink, CodeBlock, Toc],
    template: `
        <div class="mx-auto flex w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:px-10">
            <article class="min-w-0 max-w-3xl flex-1">
                <div class="font-mono text-xs text-faint">guide</div>
                <h1 class="mt-1 text-3xl font-semibold tracking-tight">Theming</h1>
                <p class="mt-2 text-[15px] text-muted">
                    Components are styled at runtime from a preset, not from a stylesheet you import. That makes theming a matter of configuration — and it puts the preset on the
                    other side of a licence boundary worth understanding.
                </p>

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="where">Where the styling comes from</h2>
                <!-- prime-names:attribution — nominative use, the same grant NOTICE relies on: naming a
                     third party to state factually where a dependency comes from and where its MIT line
                     ends. A reader deciding whether to adopt this library is owed that in the place they
                     are reading. check:names allows brand PROSE inside this region and nothing else. -->
                <p class="mt-3 text-[15px] text-muted">
                    angulux ships no theme presets of its own. <code class="code-chip">provideAngulux({{ '{' }} theme: {{ '{' }} preset {{ '}' }} {{ '}' }})</code> takes a preset
                    from <code class="code-chip">&#64;primeuix/themes</code> — PrimeTek's package, not ours — and injects the resulting CSS at runtime. Nothing is compiled into
                    your bundle at build time, which is why changing a preset is a configuration change rather than a rebuild of your styles.
                </p>
                <!-- prime-names:end -->
                <p class="mt-3 text-[15px] text-muted">
                    A practical consequence worth knowing early: a component that looks wrong on this site looks wrong in your application too, because this site styles its
                    components exactly the way yours will. The chrome around them is the only thing written by hand here.
                </p>

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="customise">Customising a preset</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    <code class="code-chip">definePreset</code> takes an existing preset and overrides the tokens you name. Everything you do not name is inherited, so a brand
                    colour is a few lines rather than a fork of a design system.
                </p>
                <agl-code-block [lines]="snippet('preset')" [palette]="palette()" label="app.config.ts" />

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="dark">Dark mode</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    The default is <code class="code-chip">'system'</code>: the operating system decides and nothing in your application overrides it. If you want a toggle, name a
                    selector instead.
                </p>
                <agl-code-block [lines]="snippet('darkSelector')" [palette]="palette()" label="app.config.ts" />
                <p class="mt-4 text-sm text-muted">
                    Then put that class on the document — and put it there <strong class="font-medium text-ink">before the first paint</strong>. This is the part that is easy to
                    get subtly wrong: a service that sets the class during bootstrap runs after the page has already been painted, so anyone on dark mode gets a white flash on
                    every navigation. On a prerendered or server-rendered site that flash is the whole page.
                </p>
                <div class="mt-4">
                    <agl-code-block [lines]="snippet('darkToggle')" [palette]="palette()" label="index.html" />
                </div>
                <p class="mt-4 text-sm text-muted">
                    Use the same selector for both halves. If your own chrome follows a button while the components follow
                    <code class="code-chip">darkModeSelector: 'system'</code>, a reader who switches gets half a dark page. This site drives both from one
                    <code class="code-chip">.dark</code> class for exactly that reason — the button in the header is the proof.
                </p>

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="unstyled">Running without the preset package</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    Supported, and not a degraded mode by accident — it is what makes the dependency genuinely optional. Structure, behaviour, accessibility and the
                    <code class="code-chip">p-*</code> class names are all still there; the colours are not.
                </p>
                <agl-code-block [lines]="snippet('unstyled')" [palette]="palette()" label="app.config.ts" />

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="licence">The licence boundary</h2>
                <!-- prime-names:attribution — the factual statement of where the preset package's MIT
                     grant ends. Saying less than this would be the dishonest option: a reader can check
                     the registry in one command. check:names allows brand PROSE here and nothing else. -->
                <p class="mt-3 text-[15px] text-muted">
                    <code class="code-chip">&#64;primeuix/themes</code> is MIT through <code class="code-chip">2.0.3</code>, and
                    <code class="code-chip">3.0.0</code> is the first commercial release. That release exists and is what the registry serves as
                    <code class="code-chip">latest</code>, so the MIT line is <strong class="font-medium text-ink">closed rather than paused</strong>. angulux declares the
                    package as an <strong class="font-medium text-ink">optional</strong> peer ranged <code class="code-chip">^2.0.0</code>, and installing angulux alone pulls in
                    zero PrimeTek packages.
                </p>
                <!-- prime-names:end -->
                <p class="mt-3 text-[15px] text-muted">
                    Be clear about what that range buys you, though — it is a <em>warning</em>, not a lock. Installing a version above it still succeeds and only prints a
                    resolution warning naming the range it broke. If the boundary matters to your legal review, pin it exactly and run a licence check in your own build rather
                    than trusting ours.
                </p>
                <div class="mt-4">
                    <agl-code-block [lines]="snippet('pin')" [palette]="palette()" label="terminal" />
                </div>
                <p class="mt-4 text-sm text-muted">
                    What this means in practice: the preset package will not receive new MIT releases, so you are choosing to sit on a version that is finished rather than one
                    that is maintained. That is a real cost and it is the honest reason to read
                    <a class="text-brand hover:underline" href="primeng-21-to-angular-22">the migration page</a> before adopting anything here — it names the alternatives,
                    including the ones that are not angulux.
                </p>

                <div class="mt-10 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
                    Next: <a class="text-brand hover:underline" routerLink="/getting-started">Getting started</a> if you have not installed it yet, or
                    <a class="text-brand hover:underline" routerLink="/">the module list</a> if you have.
                </div>
            </article>

            <aside class="hidden w-52 shrink-0 xl:block">
                <agl-toc [entries]="toc" />
            </aside>
        </div>
    `
})
export class ThemingPage {
    private readonly guide = signal<GuidePayload | null>(null);

    readonly palette = computed(() => this.guide()?.palette ?? []);

    readonly toc: TocEntry[] = [
        { id: 'where', label: 'Where styling comes from' },
        { id: 'customise', label: 'Customising a preset' },
        { id: 'dark', label: 'Dark mode' },
        { id: 'unstyled', label: 'Without the preset' },
        { id: 'licence', label: 'The licence boundary' }
    ];

    constructor() {
        inject(PendingTasks).run(async () => this.guide.set(await loadGuide()));
    }

    snippet(id: string) {
        return this.guide()?.snippets[id] ?? [];
    }
}
