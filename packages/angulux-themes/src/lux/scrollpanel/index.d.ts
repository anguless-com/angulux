import type { ScrollPanelTokenSections } from '@anguless/angulux-themes/types/scrollpanel';

export * from '@anguless/angulux-themes/types/scrollpanel';

declare const root: ScrollPanelTokenSections.Root;
declare const bar: ScrollPanelTokenSections.Bar;
declare const colorScheme: ScrollPanelTokenSections.ColorScheme;
declare const _default: {
    root: ScrollPanelTokenSections.Root;
    bar: ScrollPanelTokenSections.Bar;
    colorScheme: ScrollPanelTokenSections.ColorScheme;
};

export { bar, colorScheme, _default as default, root };
