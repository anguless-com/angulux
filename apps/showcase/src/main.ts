import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { provideAngulux } from '@anguless/angulux/config';
import { AppComponent } from './app';
import { routes } from './app.routes';

/* Zoneless, like the verification app and the inherited spec suite. A documentation site
   running in a different change-detection mode than the one the library is tested in would
   quietly become the place where mode-specific bugs hide: every demo here is also, for free,
   a zoneless smoke test of the published package. */
bootstrapApplication(AppComponent, {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZonelessChangeDetection(),
        provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'top' })),
        /* `.dark`, not the default `system`. The header has a toggle, and on the default the
           components would keep following the operating system while the chrome followed the
           button — so a reader who switched would get half a dark page. */
        provideAngulux({ theme: { preset: Aura, options: { darkModeSelector: '.dark' } } })
    ]
}).catch((err) => console.error(err));
