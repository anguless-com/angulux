import { Routes } from '@angular/router';
import { moduleTabTitle } from './nav';

// Every route names itself in the browser tab. The home page repeats the title in index.html
// because a route without one leaves the tab saying whatever the previous page said.
export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        title: 'angulux — documentation',
        loadComponent: () => import('./pages/home').then((m) => m.HomePage)
    },
    // The guide pages come FIRST. `:module` matches any single segment, so listed after these
    // it would swallow them and render "no module by that name is in the corpus" — a 200 that
    // reads as a broken link.
    {
        path: 'getting-started',
        title: 'Getting started — angulux',
        loadComponent: () => import('./pages/getting-started').then((m) => m.GettingStartedPage)
    },
    {
        path: 'theming',
        title: 'Theming — angulux',
        loadComponent: () => import('./pages/theming').then((m) => m.ThemingPage)
    },
    {
        // One route for all 65 modules. The API half of every page comes from the corpus, so
        // a module is documented the moment it enters the corpus — demos then light up the
        // page incrementally, module by module, instead of gating it.
        path: ':module',
        title: moduleTabTitle,
        loadComponent: () => import('./pages/module-page').then((m) => m.ModulePage)
    }
];
