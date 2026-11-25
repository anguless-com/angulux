import { Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GuidePayload, loadGuide } from '../data';
import { CodeBlock } from '../components/code-block';
import { Pager } from '../components/pager';
import { Toc, TocEntry } from '../components/toc';
import { CONTRAST_ROWS } from './contrast-rows';

/**
 * How the components get their looks, and where the licence line is.
 *
 * The second half is the reason this page exists as much as the first. angulux is MIT and says
 * so loudly, and its own preset is MIT too. The preset package it was derived from belongs to a
 * third party and its MIT line is closed, which matters to a reader who wants one of the presets
 * angulux does not ship. So the page says where that line is, in full, with the mitigation next
 * to it.
 *
 * The brand names that statement needs live in the template, inside declared
 * `prime-names:attribution` regions. They may NOT appear in this comment: JSDoc leaks into
 * IntelliSense, so `check:names` treats it as API surface rather than prose, and it is right to.
 */
@Component({
    selector: 'agl-theming-page',
    imports: [RouterLink, CodeBlock, Pager, Toc],
    template: `
        <div class="mx-auto flex w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:px-10">
            <article class="min-w-0 max-w-3xl flex-1">
                <div class="font-mono text-xs text-faint">guide</div>
                <h1 class="mt-1 text-3xl font-semibold tracking-tight">Theming</h1>
                <p class="mt-2 text-[15px] text-muted">
                    Components are styled at runtime from a preset, not from a stylesheet you import. That makes theming a matter of configuration. angulux ships one preset,
                    Lux, and accepts the presets of the package Lux was derived from — which sit on the other side of a licence boundary worth understanding.
                </p>

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="where">Where the styling comes from</h2>
                <!-- prime-names:attribution — nominative use, the same grant NOTICE relies on: naming a
                     third party to state factually where a dependency comes from and where its MIT line
                     ends. A reader deciding whether to adopt this library is owed that in the place they
                     are reading. check:names allows brand PROSE inside this region and nothing else. -->
                <p class="mt-3 text-[15px] text-muted">
                    <code class="code-chip">provideAngulux({{ '{' }} theme: {{ '{' }} preset {{ '}' }} {{ '}' }})</code> takes a preset and injects the resulting CSS at runtime.
                    Nothing is compiled into your bundle at build time, which is why changing a preset is a configuration change rather than a rebuild of your styles.
                </p>
                <p class="mt-3 text-[15px] text-muted">
                    The preset this site runs under is <strong class="font-medium text-ink">Lux</strong>, from
                    <code class="code-chip">&#64;anguless/angulux-themes</code>. It is derived from the Aura preset of <code class="code-chip">&#64;primeuix/themes</code> 2.0.3 —
                    PrimeTek's package, MIT at that version — and keeps every token name, so an override written for Aura applies to Lux unchanged. It changes two things:
                    the colours that carry text, which the Contrast section below lists, and the shape. Corners are rounder (8px on a field or a button, where Aura has 6px),
                    the focus ring is 2px wide instead of 1px, and a card is outlined instead of casting a shadow. Heights are the same as Aura's.
                </p>
                <p class="mt-3 text-[15px] text-muted">
                    <strong class="font-medium text-ink">Lux Compact</strong>, from <code class="code-chip">&#64;anguless/angulux-themes/lux-compact</code>, is Lux with less
                    padding: a field is 4px shorter and a table row 8px shorter. It is meant for screens that are mostly tables and forms, and it is not the default because
                    a control that short is small under a finger.
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
                    <strong class="font-medium text-ink">Lux meets WCAG AA for the text of every severity colour, in both schemes.</strong> That is the reason it exists. The
                    preset it was derived from does not: while this site still ran under that preset, in November 2026, a sweep of every text node inside a demo, measured against
                    the background actually painted behind it, found 76 failing nodes across 20 of the 51 modules that had demos. Put the same components on a card in dark mode
                    and two more colours fall short: they are the last two rows below.
                </p>
                <p class="mt-3 text-[15px] text-muted">
                    The table is what Lux changes. The left column is the upstream value, the right column is the value Lux carries. If you use Lux, you have the right column
                    already, and the override further down is not for you.
                </p>
                <div class="thin-scroll mt-4 overflow-x-auto rounded-xl border border-line">
                    <table class="w-full border-collapse text-[13px]">
                        <thead>
                            <tr class="bg-surface">
                                <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">What fails</th>
                                <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Scheme</th>
                                <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Aura</th>
                                <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Lux</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (row of contrast; track row.where + row.scheme) {
                                <tr class="border-b border-line-soft last:border-0">
                                    <td class="px-3 py-2 align-top text-ink">{{ row.where }}</td>
                                    <td class="px-3 py-2 align-top text-muted">{{ row.scheme }}</td>
                                    <td class="whitespace-nowrap px-3 py-2 align-top font-mono text-muted">
                                        {{ row.stock }} — <span class="text-caution">{{ row.stockRatio.toFixed(2) }}:1</span>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-2 align-top font-mono text-muted">{{ row.override }} — {{ row.overrideRatio.toFixed(2) }}:1</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <p class="mt-4 text-sm text-muted">
                    A fill row is white text on that colour, and the same ratio holds for an outlined or text button, which is that colour on white. The pattern behind the fills:
                    each one is the <code class="code-chip">-500</code> step of a palette, a step built for about <strong class="font-medium text-ink">3:1</strong> — the bar for a
                    border or a large heading, not for a label. Note that
                    <strong class="font-medium text-ink">one step darker is not enough for four of the six</strong>: at <code class="code-chip">-600</code>, green still measures
                    3.30 and sky 4.10. Only danger and help clear AA there.
                </p>
                <p class="mb-4 mt-3 text-sm text-muted">
                    <strong class="font-medium text-ink">If you stay on Aura</strong>, <code class="code-chip">definePreset</code> reaches all of these without forking anything.
                    The override below produces the right-hand column on top of Aura. It is measured in a browser on every build of this library, next to Lux, and the two are
                    required to give the same ratio for every text node: the code is cut out of the file that test runs, not typed onto this page.
                </p>
                <agl-code-block [lines]="snippet('contrast')" [palette]="palette()" label="app.config.ts" />
                <p class="mt-4 text-sm text-muted">
                    <strong class="font-medium text-ink">Keep it scoped to the light scheme.</strong> The shorter way is to darken the palette steps themselves, under
                    <code class="code-chip">primitive</code>, and until November 2026 this page printed exactly that. It was wrong. A primitive has no colour scheme, and the dark
                    scheme uses those same steps as text on a dark surface: measured over a card, that override took the dark success message from 5.92 to 3.05 and the dark error
                    message from 3.98 to 3.26. It also left the light warning message at 2.85 and the toggle label at 4.34, because neither reads a step it changed. If you copied
                    it, replace it with the one above.
                </p>
                <p class="mt-3 text-sm text-muted">
                    What this costs you, in Lux and in the override alike, and what it does not cover. The primary colour in light mode is two steps darker than Aura's
                    everywhere it is read, focus rings and checked boxes included. The tokens name palette steps, not ratios: if you swap the primary palette for a brand
                    colour, step 700 of your palette is a different colour and has to be measured again. Anything that extends Aura rather than Lux starts from Aura's colours.
                    And the measurement reads resting text only — hover, focus and disabled states are not in it, nor are icons.
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

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="unstyled">Running without a preset</h2>
                <p class="mb-4 mt-1 text-sm text-muted">
                    Supported, and not a degraded mode by accident — it is what makes a preset package genuinely optional. Structure, behaviour, accessibility and the
                    <code class="code-chip">p-*</code> class names are all still there; the colours are not.
                </p>
                <agl-code-block [lines]="snippet('unstyled')" [palette]="palette()" label="app.config.ts" />

                <h2 class="mt-12 scroll-mt-20 text-xl font-semibold tracking-tight" id="licence">The licence boundary</h2>
                <!-- prime-names:attribution — the factual statement of where the preset package's MIT
                     grant ends. Saying less than this would be the dishonest option: a reader can check
                     the registry in one command. check:names allows brand PROSE here and nothing else. -->
                <p class="mt-3 text-[15px] text-muted">
                    Lux is MIT and is published by this project, so an application that uses it has no PrimeTek package to pin. This section is for the other case: you want
                    Lara, Nora or Material, which angulux does not ship, or you are already on Aura and are staying there.
                </p>
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
                    What this means in practice: that package will not receive new MIT releases, so with one of its presets you are choosing to sit on a version that is finished
                    rather than one that is maintained. Lux is maintained here, and it is one preset, not four. That is a real cost either way, and it is the honest reason to read
                    <a class="text-brand hover:underline" href="primeng-21-to-angular-22">the migration page</a> before adopting anything here — it names the alternatives,
                    including the ones that are not angulux.
                </p>

                <div class="mt-10 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
                    Next: <a class="text-brand hover:underline" routerLink="/getting-started">Getting started</a> if you have not installed it yet, or
                    <a class="text-brand hover:underline" routerLink="/">the module list</a> if you have.
                </div>

                <agl-pager path="/theming" />
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
        { id: 'unstyled', label: 'Without a preset' },
        { id: 'licence', label: 'The licence boundary' }
    ];

    /**
     * Measured, not quoted: e2e/contrast.spec.ts renders every row in a browser and requires both
     * ratios to be the ones it reads. The rows live in their own file so that test can import them.
     */
    readonly contrast = CONTRAST_ROWS;

    constructor() {
        inject(PendingTasks).run(async () => this.guide.set(await loadGuide()));
    }

    snippet(id: string) {
        return this.guide()?.snippets[id] ?? [];
    }
}
