import { NgComponentOutlet } from '@angular/common';
import { Component, PendingTasks, computed, effect, inject, input, signal, Type } from '@angular/core';
import { ApiModule, Demo, loadApiIndex, loadApiModule, loadDemos } from '../data';
import { ApiGroup, ApiTable } from '../components/api-table';
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

            <!-- The import, with the name in it. Everything else on this page is unusable
                 without it, and a reader should not have to open a demo's Component tab to
                 find out what to write. -->
            <div class="code">
                <pre><code>{{ importLine() }}</code></pre>
            </div>

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
            <agl-api-table [groups]="groups()" />
        }
    `
})
export class ModulePage {
    readonly module = input.required<string>();

    readonly api = signal<ApiModule | null>(null);

    readonly sections = signal<LoadedSection[]>([]);

    readonly notFound = signal(false);

    /** The module's own declarations, each followed by the ancestors it inherits from. */
    readonly groups = signal<ApiGroup[]>([]);

    /**
     * A module with no NgModule is not a defect and must not be papered over: `icons` exports
     * standalone components under their own entry points, so the honest line names the module
     * path and says the exports come one at a time.
     */
    readonly importLine = computed(() => {
        const api = this.api();

        if (!api) return '';

        return api.ngModules.length
            ? `import { ${api.ngModules.join(', ')} } from '${api.entrypoint}';`
            : `// ${api.name} exports standalone symbols — import them by name from '${api.entrypoint}/<name>'`;
    });

    /** Captured here: an effect body is not an injection context. */
    private readonly pending = inject(PendingTasks);

    constructor() {
        effect(() => {
            const name = this.module();

            this.api.set(null);
            this.sections.set([]);
            this.notFound.set(false);

            // `name` is captured so a slow response for a module the reader has already
            // navigated away from cannot overwrite the page they are now looking at.
            this.pending.run(() => this.load(name));
        });
    }

    private async load(name: string): Promise<void> {
        try {
            const api = await loadApiModule(name);

            if (this.module() !== name) {
                return;
            }

            this.api.set(api);
            this.groups.set(await this.resolveInheritance(api));
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

    /**
     * Walk each declaration's `extends` chain and pull in what it publishes.
     *
     * The chain is followed rather than flattened into the corpus on purpose: `BaseComponent`
     * has 93 subclasses, and copying its members into every one would triple the payload and
     * lose the one fact a reader wants, which is where a member came from.
     *
     * A base with nothing to publish is skipped — `BaseModelHolder` declares no inputs, and a
     * heading over three empty tables tells a reader nothing except that the page is padded.
     */
    private async resolveInheritance(api: ApiModule): Promise<ApiGroup[]> {
        const index = await loadApiIndex();
        const home = new Map<string, string>();

        for (const entry of index) {
            for (const declared of entry.declares ?? []) home.set(declared, entry.name);
        }

        const groups: ApiGroup[] = [];

        for (const declaration of api.declarations) {
            groups.push({ declaration, inherited: false });

            const seen = new Set<string>([declaration.name]);
            let parent = declaration.extends;

            while (parent && !seen.has(parent)) {
                seen.add(parent);

                const module = home.get(parent);

                if (!module) break;

                const ancestor = (await loadApiModule(module)).declarations.find((d) => d.name === parent);

                if (!ancestor) break;

                if (ancestor.inputs.length || ancestor.outputs.length || ancestor.slots.length) {
                    groups.push({ declaration: ancestor, inherited: true });
                }

                parent = ancestor.extends;
            }
        }

        return groups;
    }
}
