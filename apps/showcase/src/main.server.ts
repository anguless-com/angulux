import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { provideAngulux } from '@anguless/angulux/config';
import { AppComponent } from './app';
import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { useJsonReader } from './data';

/**
 * The prerender entry. It exists so the HTML a search engine receives already contains the
 * API tables and the demo markup, instead of an empty shell that fills itself in once a
 * bundle has downloaded and run.
 *
 * Three things here are not obvious, and each cost a build to find out:
 *
 *   1. `provideServerRendering` comes from **`@angular/ssr`**, not `@angular/platform-server`.
 *      Both export a function of that name; the platform-server one belongs to the older
 *      pipeline.
 *   2. Angular 22 hands this function a `BootstrapContext` and **requires it back**. Without
 *      it, `bootstrapApplication` throws `NG0401: Missing Platform` from inside route
 *      extraction — which reads as a broken application rather than a missing argument.
 *   3. The payloads are read off disk. `fetch('api/button.json')` resolves against the
 *      document base URL; while prerendering there is no origin and nothing listening. The
 *      builder patches `fetch` for its own in-memory assets, but the generated `public/`
 *      files are ours, so reading them directly is the honest route to the same bytes.
 *
 * Nothing else differs from `main.ts`, deliberately: the app being prerendered has to be the
 * app being shipped, or the HTML documents behaviour the browser will not reproduce.
 * `withInMemoryScrolling` is the one omission, and only because it configures something that
 * exists once a person is scrolling — prerendering has no viewport to restore.
 */
const bootstrap = (context: BootstrapContext) => {
    useJsonReader(async (path) => {
        // Imported here rather than at module scope so nothing pulls `node:` built-ins into a
        // graph that is also reachable from the browser entry.
        const { readFile } = await import('node:fs/promises');
        const { join } = await import('node:path');

        return JSON.parse(await readFile(join(process.cwd(), 'public', path), 'utf8'));
    });

    return bootstrapApplication(
        AppComponent,
        {
            providers: [
                provideBrowserGlobalErrorListeners(),
                provideZonelessChangeDetection(),
                provideServerRendering(withRoutes(serverRoutes)),
                provideRouter(routes, withComponentInputBinding()),
                provideAngulux({ theme: { preset: Aura } })
            ]
        },
        context
    );
};

export default bootstrap;
