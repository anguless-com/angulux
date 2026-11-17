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
