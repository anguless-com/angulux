import type { ImageTokenSections } from '@anguless/angulux-themes/types/image';

export * from '@anguless/angulux-themes/types/image';

declare const root: ImageTokenSections.Root;
declare const preview: ImageTokenSections.Preview;
declare const toolbar: ImageTokenSections.Toolbar;
declare const action: ImageTokenSections.Action;
declare const _default: {
    root: ImageTokenSections.Root;
    preview: ImageTokenSections.Preview;
    toolbar: ImageTokenSections.Toolbar;
    action: ImageTokenSections.Action;
};

export { action, _default as default, preview, root, toolbar };
