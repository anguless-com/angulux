import { NgComponentOutlet } from '@angular/common';
import { Component, PendingTasks, computed, effect, inject, input, signal, Type } from '@angular/core';
import { ApiModule, Demo, loadApiIndex, loadApiModule, loadDemos } from '../data';
import { ApiGroup, ApiTable, declarationAnchor } from '../components/api-table';
import { CodeBlock } from '../components/code-block';
import { DemoCode } from '../components/demo-code';
import { Toc, TocEntry } from '../components/toc';
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
    imports: [NgComponentOutlet, ApiTable, CodeBlock, DemoCode, Toc],
    template: `
        <div class="mx-auto flex w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:px-10">
            <article class="min-w-0 max-w-3xl flex-1">
                @if (notFound()) {
                    <h1 class="text-3xl font-semibold tracking-tight">{{ module() }}</h1>
                    <p class="mt-4 rounded-xl border border-caution bg-caution-soft px-4 py-3 text-sm text-caution">No module by that name is in the corpus.</p>
                } @else if (api(); as api) {
                    <header>
                        <div class="font-mono text-xs text-faint">{{ api.entrypoint }}</div>
                        <h1 class="mt-1 text-3xl font-semibold tracking-tight">{{ api.name }}</h1>
                        @if (api.description) {
                            <p class="mt-2 text-[15px] text-muted">{{ api.description }}</p>
                        }
                        <div class="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                            <span class="rounded-full border border-line px-2 py-0.5">{{ api.declarations.length }} declarations</span>
                            @if (sections().length) {
                                <span class="rounded-full bg-brand-soft px-2 py-0.5 text-brand">{{ sections().length }} demos</span>
                            }
                        </div>
                    </header>

                    <!-- The import, with the name in it. Everything else on this page is unusable
                         without it, and a reader should not have to open a demo's Component tab to
                         find out what to write. -->
                    <div class="mt-6">
                        <agl-code-block [lines]="api.importLine" [palette]="api.palette" label="import" />
                    </div>

                    @if (sections().length) {
                        @for (loaded of sections(); track loaded.section.id) {
                            <section class="mt-12 scroll-mt-20" [id]="loaded.section.id">
                                <h2 class="text-xl font-semibold tracking-tight">{{ loaded.section.label }}</h2>
                                <p class="mb-4 mt-1 text-sm text-muted">{{ loaded.section.description }}</p>

                                <ng-container *ngComponentOutlet="loaded.component" />

                                @if (loaded.demo) {
                                    <agl-demo-code [demo]="loaded.demo" [palette]="palette()" />
                                } @else {
                                    <p class="rounded-b-xl border border-t-0 border-caution bg-caution-soft px-4 py-3 text-sm text-caution">
                                        Demo "{{ loaded.section.id }}" is registered but was not extracted — run the generate step.
                                    </p>
                                }
                            </section>
                        }
                    } @else {
                        <p class="mt-8 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
                            No demos for this module yet. The API reference below is complete: it comes from the corpus, which covers every module the library ships.
                        </p>
                    }

                    <section class="mt-14 scroll-mt-20" id="api">
                        <h2 class="text-xl font-semibold tracking-tight">API</h2>
                        <p class="mt-1 text-sm text-muted">Generated from the committed corpus, which <code class="code-chip">check:corpus</code> holds to the built library.</p>
                    </section>
                    <agl-api-table [groups]="groups()" />
                }
            </article>

            <aside class="hidden w-52 shrink-0 xl:block">
                <agl-toc [entries]="toc()" />
            </aside>
        </div>
    `
})
export class ModulePage {
    readonly module = input.required<string>();

    readonly api = signal<ApiModule | null>(null);

    readonly sections = signal<LoadedSection[]>([]);

    /** The colours this module's demo tokens index into, shipped alongside them. */
    readonly palette = signal<[string, string][]>([]);

    readonly notFound = signal(false);

    /** The module's own declarations, each followed by the ancestors it inherits from. */
    readonly groups = signal<ApiGroup[]>([]);

    /**
     * Built from the same two lists the page renders from, so it cannot list a heading the
     * page does not have.
     *
     * Inherited declarations are anchored on the page but left OUT of this list. Nearly every
     * declaration extends `BaseComponent`, so including them turned the contents of `/table`
     * into twenty-five identical "↳ BaseComponent" lines with the six names a reader was
     * looking for buried between them. A table of contents that is mostly one repeated word
     * is worse than a shorter one.
     */
    readonly toc = computed<TocEntry[]>(() => {
        if (!this.api()) return [];

        const entries: TocEntry[] = this.sections().map((loaded) => ({ id: loaded.section.id, label: loaded.section.label }));

        entries.push({ id: 'api', label: 'API' });

        for (const group of this.groups()) {
            if (!group.inherited) {
                entries.push({ id: declarationAnchor(group), label: group.declaration.name, nested: true });
            }
        }

        return entries;
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

        const payload = await loadDemos(name);
        const components = await Promise.all(defined.map((section) => section.load()));

        if (this.module() !== name) {
            return;
        }

        this.palette.set(payload.palette);
        this.sections.set(defined.map((section, index) => ({ section, component: components[index], demo: payload.demos[section.id] })));
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
