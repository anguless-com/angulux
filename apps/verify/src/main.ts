import { Type, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, provideZoneChangeDetection } from '@angular/core';
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
       `?preset=` names: the stock one, the one the Theming guide prints, the one it warns against,
       and Lux, the preset angulux ships, which has the guide's override written into its tokens. */
    const loadPreset = (): Promise<unknown> => {
        switch (new URLSearchParams(location.search).get('preset')) {
            case 'accessible':
                return import('./contrast-preset').then((m) => m.Accessible);
            case 'primitive-shift':
                return import('./contrast-preset').then((m) => m.PrimitiveShift);
            case 'lux':
                return import('@anguless/angulux-themes/lux').then((m) => m.default);
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
} else if (path.startsWith('/lux-shape') || path.startsWith('/lux-layers')) {
    /* The shape of a preset, measured, in the preset `?preset=` names: the upstream one Lux was
       derived from, Lux, or Lux Compact. /lux-shape is a page of ordinary UI (lux-shape.ts,
       e2e/lux-shape.spec.ts); /lux-layers is one floating layer at a time (lux-layers.ts,
       e2e/lux-layers.spec.ts). */
    const loadPreset = (): Promise<unknown> => {
        switch (new URLSearchParams(location.search).get('preset')) {
            case 'aura':
                return Promise.resolve(Aura);
            case 'compact':
                return import('@anguless/angulux-themes/lux-compact').then((m) => m.default);
            default:
                return import('@anguless/angulux-themes/lux').then((m) => m.default);
        }
    };
    const loadScene = (): Promise<Type<unknown>> => (path.startsWith('/lux-layers') ? import('./lux-layers').then((m) => m.LuxLayers) : import('./lux-shape').then((m) => m.LuxShape));
    Promise.all([loadPreset(), loadScene()])
        .then(([preset, scene]) =>
            bootstrapApplication(scene, {
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
} else if (path.startsWith('/reported')) {
    /* Defects reported against a published version (reported.ts, e2e/reported-issues.spec.ts), one per `?case=`. */
    import('./reported')
        .then(({ Reported }) =>
            bootstrapApplication(Reported, {
                providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
            })
        )
        .catch((err) => console.error(err));
} else if (path.startsWith('/speed')) {
    /* The scenes tools/measure-speed.mjs times (speed.ts), one per `?scene=`. */
    import('./speed')
        .then(({ Speed }) =>
            bootstrapApplication(Speed, {
                providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
            })
        )
        .catch((err) => console.error(err));
} else if (path.startsWith('/focus-trap')) {
    /* A focus trap between two buttons, driven with the real Tab key (focus-trap.ts, e2e/focus-trap.spec.ts). */
    import('./focus-trap')
        .then(({ FocusTrapPage }) =>
            bootstrapApplication(FocusTrapPage, {
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
