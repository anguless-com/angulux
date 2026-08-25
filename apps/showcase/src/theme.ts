import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ColorScheme = 'light' | 'dark';

/** Shared with the inline script in `index.html`, which is what actually sets the class. */
export const SCHEME_KEY = 'agl-scheme';

/**
 * The colour-scheme toggle.
 *
 * It does not decide the initial scheme — the inline script in `index.html` does, before the
 * first paint, because this class cannot run until a bundle has downloaded and by then the
 * page has already been painted in the wrong colours. All this does is read what that script
 * concluded and flip it afterwards.
 *
 * Every DOM access is behind `isPlatformBrowser`. The site is prerendered in Node, where
 * `document` does not exist; reaching for it unguarded is the exact defect that was fixed in
 * `BadgeDirective`, and it would take this whole site down rather than one component.
 */
@Injectable({ providedIn: 'root' })
export class ColorSchemeToggle {
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

    /** `light` while prerendering: the served HTML carries no class, and the script adds one. */
    readonly scheme = signal<ColorScheme>('light');

    constructor() {
        if (this.browser) {
            this.scheme.set(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        }
    }

    toggle(): void {
        if (!this.browser) {
            return;
        }

        const next: ColorScheme = this.scheme() === 'dark' ? 'light' : 'dark';

        document.documentElement.classList.toggle('dark', next === 'dark');
        this.scheme.set(next);

        // Private-browsing modes throw on write rather than returning false. A reader who
        // cannot persist the choice should still get the colours they just asked for.
        try {
            localStorage.setItem(SCHEME_KEY, next);
        } catch {
            /* not persisted; the toggle still works for this page view */
        }
    }
}
