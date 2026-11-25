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
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The one exception to the warning above: a snippet cut out of code that ran.
 *
 * Returns the text between `// guide:<name>:start` and `// guide:<name>:end` in a source file, with
 * the file's imports in front. The contrast override is cut this way from the file the browser gate
 * measures (e2e/contrast.spec.ts), so the numbers the guide quotes for it are numbers of the very
 * code the reader copies.
 */
function cut(file, name) {
    const source = readFileSync(resolve(HERE, file), 'utf8').replace(/\r\n/g, '\n');
    const start = `// guide:${name}:start\n`;
    const end = `// guide:${name}:end`;
    const from = source.indexOf(start);
    const to = source.indexOf(end);

    if (from === -1 || to === -1 || to < from) throw new Error(`guide-snippets: ${file} has no guide:${name} region`);

    const imports = source.split('\n').filter((line) => line.startsWith('import ')).join('\n');

    return `${imports}\n\n${source.slice(from + start.length, to).trimEnd()}`;
}

/**
 * The packages to install, written once. The four install commands below are the same list
 * behind each package manager's own verb, so they cannot disagree about what to install.
 */
const PACKAGES = '@anguless/angulux @anguless/angulux-themes primeicons';

export const SNIPPETS = {
    'install-pnpm': { lang: 'shell', code: `pnpm add ${PACKAGES}` },
    'install-npm': { lang: 'shell', code: `npm install ${PACKAGES}` },
    'install-yarn': { lang: 'shell', code: `yarn add ${PACKAGES}` },
    'install-bun': { lang: 'shell', code: `bun add ${PACKAGES}` },

    provide: {
        lang: 'source',
        code: `import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideAngulux } from '@anguless/angulux/config';
import Lux from '@anguless/angulux-themes/lux';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideAngulux({
            theme: { preset: Lux }
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
        code: `// No preset package at all. provideAngulux() still works;
// components render with structure and behaviour but no preset colours.
provideAngulux()`
    },

    darkSelector: {
        lang: 'source',
        code: `provideAngulux({
    theme: {
        preset: Lux,
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
        code: `import { definePreset } from '@anguless/angulux-themes';
import Lux from '@anguless/angulux-themes/lux';

const Brand = definePreset(Lux, {
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

    contrast: {
        lang: 'source',
        code: `${cut('../../verify/src/contrast-preset.ts', 'contrast')}

provideAngulux({ theme: { preset: Accessible } });`
    },

    pin: {
        lang: 'shell',
        code: `# Only if you use a preset from the upstream package instead of Lux.
# The range angulux declares is a WARNING, not a lock: installing 3.x
# still succeeds and only prints a resolution warning. If the licence
# boundary matters to your review, pin it and check it in your own build.
pnpm add @primeuix/themes@2.0.3 --save-exact`
    }
};
