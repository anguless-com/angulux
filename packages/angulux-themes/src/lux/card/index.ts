import type { CardDesignTokens, CardTokenSections } from '@anguless/angulux-themes/types/card';

export const root: CardTokenSections.Root = {
    background: '{content.background}',
    borderRadius: '{border.radius.xl}',
    color: '{content.color}',
    shadow: '0 0 0 1px {content.border.color}'
};

export const body: CardTokenSections.Body = {
    padding: '1.25rem',
    gap: '0.5rem'
};

export const caption: CardTokenSections.Caption = {
    gap: '0.5rem'
};

export const title: CardTokenSections.Title = {
    fontSize: '1.25rem',
    fontWeight: '500'
};

export const subtitle: CardTokenSections.Subtitle = {
    color: '{text.muted.color}'
};

export default {
    root,
    body,
    caption,
    title,
    subtitle
} satisfies CardDesignTokens;
