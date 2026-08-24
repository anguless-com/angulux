import { NgComponentOutlet } from '@angular/common';
import { Component, effect, input, signal, Type } from '@angular/core';
import { ApiModule, Demo, loadApiModule, loadDemos } from '../data';
import { ApiTable } from '../components/api-table';
import { DemoCode } from '../components/demo-code';
import { DEMO_SECTIONS, DemoSection } from '../doc/registry';

interface LoadedSection {
    section: DemoSection;
    component: Type<unknown>;
    demo: Demo | undefined;
}

/**
 * One page per module. The API half always renders — it comes from the corpus, which covers
 * all 64 modules. The demo half renders whatever has been written so far.
 *
 * Splitting it this way is what makes inheriting demos incremental instead of all-or-nothing:
 * the site is complete and correct on day one about what the API *is*, and grows a demo at a
 * time about how to use it. A page with no demos says so, rather than looking finished.
 */
@Component({
    selector: 'agl-module-page',
    standalone: true,
    imports: [NgComponentOutlet, ApiTable, DemoCode],
    template: `
        @if (notFound()) {
            <h1 class="page-title">{{ module() }}</h1>
            <p class="note">No module by that name is in the corpus.</p>
        } @else if (api(); as api) {
            <h1 class="page-title">{{ api.name }}</h1>
            <p class="entrypoint">{{ api.entrypoint }}</p>

            @if (api.description) {
                <p class="section-text">{{ api.description }}</p>
            }

            @if (sections().length) {
                @for (loaded of sections(); track loaded.section.id) {
                    <h2 class="section-title" [id]="loaded.section.id">{{ loaded.section.label }}</h2>
                    <p class="section-text">{{ loaded.section.description }}</p>

                    <ng-container *ngComponentOutlet="loaded.component" />

                    @if (loaded.demo) {
                        <agl-demo-code [demo]="loaded.demo" />
                    } @else {
                        <p class="note">Demo "{{ loaded.section.id }}" is registered but was not extracted — run the generate step.</p>
                    }
                }
            } @else {
                <p class="note">No demos for this module yet. The API reference below is complete: it comes from the corpus, which covers every module the library ships.</p>
            }

            <h2 class="section-title">API</h2>
            <p class="section-text">Generated from the committed corpus, which <code>check:corpus</code> holds to the built library.</p>
            <agl-api-table [declarations]="api.declarations" />
        }
    `
})
export class ModulePage {
    readonly module = input.required<string>();

    readonly api = signal<ApiModule | null>(null);

    readonly sections = signal<LoadedSection[]>([]);

    readonly notFound = signal(false);

    constructor() {
        effect(() => {
            const name = this.module();

            this.api.set(null);
            this.sections.set([]);
            this.notFound.set(false);

            // `name` is captured so a slow response for a module the reader has already
            // navigated away from cannot overwrite the page they are now looking at.
            void this.load(name);
        });
    }

    private async load(name: string): Promise<void> {
        try {
            const api = await loadApiModule(name);

            if (this.module() !== name) {
                return;
            }

            this.api.set(api);
        } catch {
            if (this.module() === name) {
                this.notFound.set(true);
            }

            return;
        }

        const defined = DEMO_SECTIONS[name] ?? [];

        if (!defined.length) {
            return;
        }

        const demos = await loadDemos();
        const components = await Promise.all(defined.map((section) => section.load()));

        if (this.module() !== name) {
            return;
        }

        this.sections.set(defined.map((section, index) => ({ section, component: components[index], demo: demos[section.id] })));
    }
}
