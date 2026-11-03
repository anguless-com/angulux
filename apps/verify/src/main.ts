import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import Aura from '@primeuix/themes/aura';
import { provideAngulux } from '@anguless/angulux/config';
import { AppComponent } from './app';
import { Upstream221 } from './upstream-22-1';

/* `/upstream-22-1` is the second probe page: the 22.1.1 to 22.1.4 changelog entries, one scenario per
   `?case=`, so a table of two thousand rows is only built by the test that measures it. */
const root = location.pathname.startsWith('/upstream-22-1') ? Upstream221 : AppComponent;

/* Zoneless — the same mode the inherited spec suite runs in, and the one Angular 22 is
   moving toward by default. Running the verification app in a different mode than the specs
   would hollow out the browser gate: what needs proving is that the library is correct in
   the very mode real projects will ship it in. */
bootstrapApplication(root, {
    providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
}).catch((err) => console.error(err));
