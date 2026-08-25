import { Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiIndexEntry, loadApiIndex } from './data';
import { DEMO_SECTIONS } from './doc/registry';

/**
 * The shell. Its nav is built from the corpus index, not from a hand-kept list — so a module
 * cannot be in the library and missing from the site, which is the failure a hand-kept nav
 * produces every time and never announces.
 */
@Component({
    selector: 'agl-showcase-root',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    template: `
        <div class="shell">
            <nav class="sidebar">
                <a class="brand" routerLink="/">
                    angulux
                    <small>MIT fork of PrimeNG 21.1.9, for Angular 22</small>
                </a>

                <div class="nav-heading">With demos ({{ documented().length }})</div>
                @for (module of documented(); track module.name) {
                    <a class="nav-link" [routerLink]="['/', module.name]" routerLinkActive="active">
                        <span>{{ module.name }}</span>
                        <span class="nav-badge">{{ demoCount(module.name) }}</span>
                    </a>
                }

                <div class="nav-heading">API only ({{ apiOnly().length }})</div>
                @for (module of apiOnly(); track module.name) {
                    <a class="nav-link" [routerLink]="['/', module.name]" routerLinkActive="active">
                        <span>{{ module.name }}</span>
                    </a>
                }
            </nav>

            <main class="content">
                <router-outlet />
            </main>
        </div>
    `
})
export class AppComponent {
    private readonly modules = signal<ApiIndexEntry[]>([]);

    readonly documented = computed(() => this.modules().filter((module) => module.name in DEMO_SECTIONS));

    readonly apiOnly = computed(() => this.modules().filter((module) => !(module.name in DEMO_SECTIONS)));

    constructor() {
        // Declared to Angular, not merely started. Prerendering serialises as soon as the
        // application is stable, and a bare promise is invisible to that check — the nav would
        // be rendered empty into every one of the 65 pages.
        inject(PendingTasks).run(async () => this.modules.set(await loadApiIndex()));
    }

    demoCount(name: string): number {
        return DEMO_SECTIONS[name]?.length ?? 0;
    }
}
