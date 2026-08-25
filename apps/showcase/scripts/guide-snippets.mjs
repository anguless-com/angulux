/**
 * The code on the guide pages.
 *
 * It lives here, as data, rather than inline in the page templates, for one reason: it has to
 * be coloured, and colouring happens at build time (`highlight.mjs` says why). A string typed
 * into an Angular template is never seen by a build step and would be the only grey code left
 * on the site.
 *
 * ⚠️ Unlike a demo, none of this is extracted from something that RAN. Demos are cut out of a
 * component the page renders directly above the snippet, so they cannot drift; these are
 * written by hand and can. Keep them short, keep them boring, and prefer sending the reader to
 * a module page — those are the ones the machinery guarantees.
 */
export const SNIPPETS = {
    install: {
        lang: 'shell',
        code: `pnpm add @anguless/angulux @primeuix/themes primeicons`
    },

    provide: {
        lang: 'source',
        code: `import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideAngulux } from '@anguless/angulux/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideAngulux({
            theme: { preset: Aura }
        })
    ]
};`
    },

    styles: {
        lang: 'source',
        code: `/* angular.json -> projects.<app>.architect.build.options.styles */
"styles": [
    "src/styles.css",
    "node_modules/primeicons/primeicons.css"
]`
    },

    use: {
        lang: 'template',
        code: `<agl-button label="Save" (onClick)="save()" />

<agl-inputNumber [(ngModel)]="quantity" [min]="0" [max]="100" />`
    },

    useComponent: {
        lang: 'source',
        code: `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@anguless/angulux/button';
import { InputNumberModule } from '@anguless/angulux/inputnumber';

@Component({
    selector: 'app-order',
    standalone: true,
    imports: [FormsModule, ButtonModule, InputNumberModule],
    templateUrl: './order.html'
})
export class Order {
    quantity = 1;

    save(): void {
        /* … */
    }
}`
    },

    unstyled: {
        lang: 'source',
        code: `// Drop @primeuix/themes entirely. provideAngulux() still works;
// components render with structure and behaviour but no preset colours.
provideAngulux()`
    },

    darkSelector: {
        lang: 'source',
        code: `provideAngulux({
    theme: {
        preset: Aura,
        options: {
            // Default is 'system' — the operating system decides and nothing you
            // write can override it. Name a selector to drive it yourself.
            darkModeSelector: '.dark'
        }
    }
})`
    },

    darkToggle: {
        lang: 'source',
        code: `// Decide the class BEFORE the first paint, in index.html <head>.
// An Angular service cannot: by the time a bundle has run, the page is painted.
(function () {
    try {
        var stored = localStorage.getItem('scheme');
        var dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;

        if (dark) document.documentElement.classList.add('dark');
    } catch (e) {
        /* storage blocked: light is the correct fallback */
    }
})();`
    },

    preset: {
        lang: 'source',
        code: `import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const Brand = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{indigo.50}',
            500: '{indigo.500}',
            900: '{indigo.900}'
        }
    }
});

provideAngulux({ theme: { preset: Brand } });`
    },

    pin: {
        lang: 'shell',
        code: `# The range angulux declares is a WARNING, not a lock: installing 3.x
# still succeeds and only prints a resolution warning. If the licence
# boundary matters to your review, pin it and check it in your own build.
pnpm add @primeuix/themes@2.0.3 --save-exact`
    }
};
