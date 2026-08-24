import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiIndexEntry, loadApiIndex } from '../data';
import { DEMO_SECTIONS } from '../doc/registry';

/**
 * Every count on this page is computed from the corpus index, never typed in. The scope of
 * this fork is a number that has already been got wrong once by being written down, so the
 * site is built so that writing it down is not possible.
 */
@Component({
    selector: 'agl-home-page',
    standalone: true,
    imports: [RouterLink],
    template: `
        <h1 class="page-title">angulux</h1>
        <p class="entrypoint">An MIT fork of PrimeNG 21.1.9, maintained for Angular 22.</p>

        <p class="section-text">
            {{ moduleCount() }} modules ship in the library, and every one of them has an API reference here, generated from the same corpus that produces
            <a href="llms.txt">llms.txt</a>. Modules with runnable demos so far: {{ documentedCount() }}.
        </p>

        <h2 class="section-title">Install</h2>
        <div class="code">
            <pre><code>pnpm add &#64;anguless/angulux &#64;primeuix/themes</code></pre>
        </div>

        <h2 class="section-title">Coming from PrimeNG 21?</h2>
        <p class="section-text">
            There is a page for that, and it is honest about the options — most of which are not angulux:
            <a href="primeng-21-to-angular-22">PrimeNG 21 to Angular 22</a>.
        </p>

        <h2 class="section-title">For assistants</h2>
        <p class="section-text">
            The whole API is published in machine-readable form: <a href="llms.txt">llms.txt</a>, <a href="llms-full.txt">llms-full.txt</a>, and one Markdown page per module.
        </p>

        <h2 class="section-title">Modules with demos</h2>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Module</th>
                        <th>Entrypoint</th>
                        <th>Demos</th>
                    </tr>
                </thead>
                <tbody>
                    @for (module of documented(); track module.name) {
                        <tr>
                            <td><a [routerLink]="['/', module.name]">{{ module.name }}</a></td>
                            <td class="mono">{{ module.entrypoint }}</td>
                            <td>{{ demoCount(module.name) }}</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>

        <h2 class="section-title">Attribution</h2>
        <!-- prime-names:attribution — the MIT notice angulux is obliged to retain, plus the
             nominative-use statement from NOTICE. check:names allows brand PROSE here, and
             nothing else: a selector, an import or a branded API name still fails inside. -->
        <p class="section-text">
            angulux is derived from PrimeNG 21.1.9 and primeuix, both MIT, Copyright (c) 2016-2026 PrimeTek. The demos on this site are derived from the PrimeNG showcase at that
            same release. The original licence and notice are retained in the repository, and every upstream commit SHA is recorded in
            <code>PROVENANCE.md</code>.
        </p>
        <p class="section-text">
            angulux is not affiliated with, endorsed by, or sponsored by PrimeTek. "PrimeNG" and "PrimeTek" are trademarks of their respective owners and appear here only to state
            factually where this code came from. "Angular" is a trademark of Google LLC.
        </p>
        <!-- prime-names:end -->
    `
})
export class HomePage {
    private readonly modules = signal<ApiIndexEntry[]>([]);

    readonly moduleCount = computed(() => this.modules().length);

    readonly documented = computed(() => this.modules().filter((module) => module.name in DEMO_SECTIONS));

    readonly documentedCount = computed(() => this.documented().length);

    constructor() {
        loadApiIndex().then((modules) => this.modules.set(modules));
    }

    demoCount(name: string): number {
        return DEMO_SECTIONS[name]?.length ?? 0;
    }
}
