import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import Aura from '@primeuix/themes/aura';
import { provideAngulux } from 'angulux/config';
import { AppComponent } from './app';

/* Zoneless — the same mode the inherited spec suite runs in, and the one Angular 22 is
   moving toward by default. Running the verification app in a different mode than the specs
   would hollow out the browser gate: what needs proving is that the library is correct in
   the very mode real projects will ship it in. */
bootstrapApplication(AppComponent, {
    providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAngulux({ theme: { preset: Aura } })]
}).catch((err) => console.error(err));
