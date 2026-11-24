import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, inject, signal } from '@angular/core';
import { usePreset } from '@anguless/angulux-themes';
import Lux from '@anguless/angulux-themes/lux';

export type PresetId = 'lux' | 'compact';

/**
 * The preset the components on this site are drawn in, as chosen on the home page.
 *
 * Lux is what every page is prerendered and bootstrapped in (main.ts). Lux Compact is loaded only
 * when someone asks for it, so a reader who never does pays nothing for it.
 *
 * The choice lives for the page view and is not stored. A stored choice would have to be applied
 * before the first paint to avoid redrawing every component a moment after load, the way the
 * colour scheme is in index.html, and a preview control does not earn that.
 *
 * It applies to the whole site, not the home page alone: a preset is a set of CSS variables on
 * the document, which is also how a reader's application would switch one.
 */
@Service()
export class PresetChoice {
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

    readonly current = signal<PresetId>('lux');

    async choose(id: PresetId): Promise<void> {
        if (!this.browser || id === this.current()) {
            return;
        }

        const preset = id === 'compact' ? (await import('@anguless/angulux-themes/lux-compact')).default : Lux;

        usePreset(preset);
        this.current.set(id);
    }
}
