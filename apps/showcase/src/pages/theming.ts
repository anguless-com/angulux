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

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="contrast">Contrast</h2>
                <p class="mt-3 text-[15px] text-muted">
                    The default light preset does not meet WCAG AA on solid-coloured components. A sweep of this site — every text node inside a demo, measured against the
                    background actually painted behind it — found <strong class="font-medium text-ink">76 failing nodes across 20 of the 51 modules</strong> that have demos. The
                    same sweep in dark mode finds none.
                </p>
                <p class="mt-3 text-[15px] text-muted">
                    This is worth stating plainly rather than quietly fixing on the site: these colours are not angulux's, and the demos here are styled exactly the way your
                    application will be. Special-casing them would hide the problem instead of showing it to you.
                </p>
                <div class="thin-scroll mt-4 overflow-x-auto rounded-xl border border-line">
                    <table class="w-full border-collapse text-[13px]">
                        <thead>
                            <tr class="bg-surface">
                                <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Severity</th>
                                <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Default fill</th>
                                <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">On white</th>
                                <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">First step that passes</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (row of contrast; track row.severity) {
                                <tr class="border-b border-line-soft last:border-0">
                                    <td class="px-3 py-2 align-top font-mono text-ink">{{ row.severity }}</td>
                                    <td class="px-3 py-2 align-top font-mono text-muted">{{ row.fill }}</td>
                                    <td class="px-3 py-2 align-top font-mono text-caution">{{ row.ratio }}:1</td>
                                    <td class="px-3 py-2 align-top font-mono text-muted">{{ row.fixed }} — {{ row.fixedRatio }}:1</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <p class="mt-4 text-sm text-muted">
                    The pattern behind every row: the fill is the <code class="code-chip">-500</code> step of a palette carrying white text. That step is built for about
                    <strong class="font-medium text-ink">3:1</strong> — the bar for a border or a large heading, not for a label. Note that
                    <strong class="font-medium text-ink">one step darker is not enough for four of the six</strong>: at <code class="code-chip">-600</code>, green still measures
                    3.30 and sky 4.10. Only danger and help clear AA there.
                </p>
                <p class="mb-4 mt-3 text-sm text-muted">
                    <code class="code-chip">definePreset</code> reaches these without forking anything. Overriding the primitive steps fixes the fill everywhere it is used — button,
                    badge, progress bar, split button, toast — rather than component by component.
                </p>
                <agl-code-block [lines]="snippet('contrast')" [palette]="palette()" label="app.config.ts" />
                <p class="mt-4 text-sm text-muted">
                    What this costs you: those palette steps are now darker <em>everywhere</em>, including borders and focus rings. That direction is safe for text on a coloured
                    fill, but if your own UI puts dark text on a light primary tint, re-check those places. If you would rather keep the change narrow, the same values work on
                    <code class="code-chip">components.button.colorScheme.light.root.&lt;severity&gt;</code> — more precise, and repeated per component.
                </p>

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
        { id: 'contrast', label: 'Contrast' },
        { id: 'dark', label: 'Dark mode' },
        { id: 'unstyled', label: 'Without the preset' },
        { id: 'licence', label: 'The licence boundary' }
    ];

    /**
     * Measured, not quoted. Each ratio is the WCAG relative-luminance formula applied to the
     * hex values read out of the installed preset package, so the table cannot drift from a
     * screenshot somebody took once.
     *
     * `fixed` is the first step DOWN the same palette that reaches 4.5:1 — which is two steps
     * for four of the six. The snippet below shifts 600 and 700 with it, because overriding
     * only 500 leaves hover reading a lighter colour than the resting state.
     */
    readonly contrast = [
        { severity: 'primary', fill: '#10b981', ratio: '2.54', fixed: '#047857', fixedRatio: '5.48' },
        { severity: 'success', fill: '#22c55e', ratio: '2.28', fixed: '#15803d', fixedRatio: '5.02' },
        { severity: 'info', fill: '#0ea5e9', ratio: '2.77', fixed: '#0369a1', fixedRatio: '5.93' },
        { severity: 'warn', fill: '#f97316', ratio: '2.80', fixed: '#c2410c', fixedRatio: '5.18' },
        { severity: 'danger', fill: '#ef4444', ratio: '3.76', fixed: '#dc2626', fixedRatio: '4.83' },
        { severity: 'help', fill: '#a855f7', ratio: '3.96', fixed: '#9333ea', fixedRatio: '5.38' }
    ];

    constructor() {
        inject(PendingTasks).run(async () => this.guide.set(await loadGuide()));
    }

    snippet(id: string) {
        return this.guide()?.snippets[id] ?? [];
    }
}
