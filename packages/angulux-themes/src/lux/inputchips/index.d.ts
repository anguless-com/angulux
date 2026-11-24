import type { InputChipsTokenSections } from '@anguless/angulux-themes/types/inputchips';

export * from '@anguless/angulux-themes/types/inputchips';

declare const root: InputChipsTokenSections.Root;
declare const chip: InputChipsTokenSections.Chip;
declare const colorScheme: InputChipsTokenSections.ColorScheme;
declare const _default: {
    root: InputChipsTokenSections.Root;
    chip: InputChipsTokenSections.Chip;
    colorScheme: InputChipsTokenSections.ColorScheme;
};

export { chip, colorScheme, _default as default, root };
