import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home').then((m) => m.HomePage)
    },
    // The guide pages come FIRST. `:module` matches any single segment, so listed after these
    // it would swallow them and render "no module by that name is in the corpus" — a 200 that
    // reads as a broken link.
    {
        path: 'getting-started',
        loadComponent: () => import('./pages/getting-started').then((m) => m.GettingStartedPage)
    },
    {
        path: 'theming',
        loadComponent: () => import('./pages/theming').then((m) => m.ThemingPage)
    },
    {
        // One route for all 65 modules. The API half of every page comes from the corpus, so
        // a module is documented the moment it enters the corpus — demos then light up the
        // page incrementally, module by module, instead of gating it.
        path: ':module',
        loadComponent: () => import('./pages/module-page').then((m) => m.ModulePage)
    }
];
