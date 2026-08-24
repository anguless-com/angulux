import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home').then((m) => m.HomePage)
    },
    {
        // One route for all 64 modules. The API half of every page comes from the corpus, so
        // a module is documented the moment it enters the corpus — demos then light up the
        // page incrementally, module by module, instead of gating it.
        path: ':module',
        loadComponent: () => import('./pages/module-page').then((m) => m.ModulePage)
    }
];
