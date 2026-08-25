import { Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiIndexEntry, LibraryVersion, loadApiIndex, loadVersion } from './data';
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

                <!-- What a reader needs before trusting any page: which version this describes,
                     and where the code is. The version is the git TAG, not the number in the
                     root manifest — that one says 22.0.0-rc.0, which never existed on npm. -->
                @if (version(); as version) {
                    <div class="brand-meta">
                        @if (version.released) {
                            <span>documents {{ version.released }}</span>
                            @if (version.unreleased) {
                                <span class="unreleased" title="Changes on main that are not in any release yet">+{{ version.unreleased }} unreleased</span>
                            }
                        }
                    </div>
                }

                <div class="brand-links">
                    <a href="https://github.com/anguless-com/angulux">GitHub</a>
                    <a href="https://www.npmjs.com/package/&#64;anguless/angulux">npm</a>
                    <a href="llms.txt">llms.txt</a>
                </div>

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

    readonly version = signal<LibraryVersion | null>(null);

    readonly documented = computed(() => this.modules().filter((module) => module.name in DEMO_SECTIONS));

    readonly apiOnly = computed(() => this.modules().filter((module) => !(module.name in DEMO_SECTIONS)));

    constructor() {
        // Declared to Angular, not merely started. Prerendering serialises as soon as the
        // application is stable, and a bare promise is invisible to that check — the nav would
        // be rendered empty into every one of the 65 pages.
        const pending = inject(PendingTasks);

        pending.run(async () => this.modules.set(await loadApiIndex()));
        pending.run(async () => this.version.set(await loadVersion()));
    }

    demoCount(name: string): number {
        return DEMO_SECTIONS[name]?.length ?? 0;
    }
}
