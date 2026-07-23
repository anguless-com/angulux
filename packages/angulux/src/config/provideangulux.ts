import { EnvironmentProviders, inject, InjectionToken, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { AnguluxConfig } from './anguluxconfig';
import type { AnguluxConfigType } from './anguluxconfig.types';

export const ANGULUX_CONFIG = new InjectionToken<AnguluxConfigType>('ANGULUX_CONFIG');

export function provideAngulux(...features: AnguluxConfigType[]): EnvironmentProviders {
    const providers = features?.map((feature) => ({
        provide: ANGULUX_CONFIG,
        useValue: feature,
        multi: false
    }));

    const initializer = provideAppInitializer(() => {
        const config = inject(AnguluxConfig);
        features?.forEach((feature) => config.setConfig(feature));
        return;
    });

    return makeEnvironmentProviders([...providers, initializer]);
}
