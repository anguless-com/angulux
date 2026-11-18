import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import Aura from '@primeuix/themes/aura';
import { provideAngulux } from '@anguless/angulux/config';
import { AppComponent } from './app';
import { Upstream221 } from './upstream-22-1';
import { Upstream2215 } from './upstream-22-1-5';
import { UpstreamSelect } from './upstream-select';

const path = location.pathname;

if (path.startsWith('/upstream-zone')) {
    /* The one zone-based page (upstream-zone.ts). zone.js is loaded here, before bootstrap, and
       only for this path, so every other page keeps running zoneless. */
    import('zone.js')
        .then(() => import('./upstream-zone'))
        .then(({ UpstreamZone }) =>
            bootstrapApplication(UpstreamZone, {
                providers: [provideBrowserGlobalErrorListeners(), provideZoneChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
            })
        )
        .catch((err) => console.error(err));
} else if (path.startsWith('/table-edge')) {
    /* The line above a selected row (table-edge.ts), in the preset `?preset=` names, so the
       comparison in e2e/table-selected-edge.spec.ts covers every preset the themes package ships. */
    const loadPreset = (): Promise<{ default: unknown }> => {
        switch (new URLSearchParams(location.search).get('preset')) {
            case 'lara':
                return import('@primeuix/themes/lara');
            case 'nora':
                return import('@primeuix/themes/nora');
            case 'material':
                return import('@primeuix/themes/material');
            default:
                return import('@primeuix/themes/aura');
        }
    };
    Promise.all([loadPreset(), import('./table-edge')])
        .then(([preset, { TableEdge }]) =>
            bootstrapApplication(TableEdge, {
                providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: preset.default } })]
            })
        )
        .catch((err) => console.error(err));
} else if (path.startsWith('/contrast')) {
    /* Severity colours for the contrast sweep (contrast.ts, e2e/contrast.spec.ts), in the preset
       `?preset=` names: the stock one, the one the Theming guide prints, and the one it warns against. */
    const loadPreset = (): Promise<unknown> => {
        switch (new URLSearchParams(location.search).get('preset')) {
            case 'accessible':
                return import('./contrast-preset').then((m) => m.Accessible);
            case 'primitive-shift':
                return import('./contrast-preset').then((m) => m.PrimitiveShift);
            default:
                return Promise.resolve(Aura);
        }
    };
    Promise.all([loadPreset(), import('./contrast')])
        .then(([preset, { Contrast }]) =>
            bootstrapApplication(Contrast, {
                providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset } })]
            })
        )
        .catch((err) => console.error(err));
} else if (path.startsWith('/overlay-race')) {
    /* Panels closed again before their enter motion starts (overlay-race.ts, e2e/overlay-race.spec.ts). */
    import('./overlay-race')
        .then(({ OverlayRace }) =>
            bootstrapApplication(OverlayRace, {
                providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
            })
        )
        .catch((err) => console.error(err));
} else if (path.startsWith('/menu-links')) {
    /* Menu items that are plain links (menu-links.ts, e2e/menu-links.spec.ts). */
    import('./menu-links')
        .then(({ MenuLinks }) =>
            bootstrapApplication(MenuLinks, {
                providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
            })
        )
        .catch((err) => console.error(err));
} else if (path.startsWith('/narrow')) {
    /* Components at phone widths (narrow.ts, e2e/narrow-reflow.spec.ts). */
    import('./narrow')
        .then(({ Narrow }) =>
            bootstrapApplication(Narrow, {
                providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
            })
        )
        .catch((err) => console.error(err));
} else {
    /* `/upstream-22-1`, `/upstream-22-1-5` and `/upstream-select` are the upstream probe pages, one scenario per `?case=`,
       so a table of two thousand rows is only built by the test that measures it. */
    const root = path.startsWith('/upstream-select')
        ? UpstreamSelect
        : path.startsWith('/upstream-22-1-5')
          ? Upstream2215
          : path.startsWith('/upstream-22-1')
            ? Upstream221
            : AppComponent;

    /* Zoneless — the same mode the inherited spec suite runs in, and the one Angular 22 is
       moving toward by default. Running the verification app in a different mode than the specs
       would hollow out the browser gate: what needs proving is that the library is correct in
       the very mode real projects will ship it in. */
    bootstrapApplication(root, {
        providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
    }).catch((err) => console.error(err));
}
