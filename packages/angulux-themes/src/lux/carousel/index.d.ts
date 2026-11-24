import type { CarouselTokenSections } from '@anguless/angulux-themes/types/carousel';

export * from '@anguless/angulux-themes/types/carousel';

declare const root: CarouselTokenSections.Root;
declare const content: CarouselTokenSections.Content;
declare const indicatorList: CarouselTokenSections.IndicatorList;
declare const indicator: CarouselTokenSections.Indicator;
declare const colorScheme: CarouselTokenSections.ColorScheme;
declare const _default: {
    root: CarouselTokenSections.Root;
    content: CarouselTokenSections.Content;
    indicatorList: CarouselTokenSections.IndicatorList;
    indicator: CarouselTokenSections.Indicator;
    colorScheme: CarouselTokenSections.ColorScheme;
};

export { colorScheme, content, _default as default, indicator, indicatorList, root };
