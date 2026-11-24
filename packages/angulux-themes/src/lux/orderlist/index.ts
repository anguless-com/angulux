import type { OrderListDesignTokens, OrderListTokenSections } from '@anguless/angulux-themes/types/orderlist';

export const root: OrderListTokenSections.Root = {
    gap: '1.125rem'
};

export const controls: OrderListTokenSections.Controls = {
    gap: '0.5rem'
};

export default {
    root,
    controls
} satisfies OrderListDesignTokens;
