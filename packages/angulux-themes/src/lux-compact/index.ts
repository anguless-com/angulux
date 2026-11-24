import { definePreset } from '@anguless/angulux-styled';
import Lux from '@anguless/angulux-themes/lux';
import type { Preset } from '@anguless/angulux-themes/types';

/*
 * Lux with less padding, for screens that are mostly tables and forms.
 *
 * It is Lux plus the overrides below and nothing else: every colour, radius and shadow is Lux's.
 * A field, a button and a select are 4px shorter than in Lux and a table row 8px shorter
 * (e2e/lux-shape.spec.ts measures both). With the system font of macOS that is 32px instead of
 * 36px and 42px instead of 50px; another font has another line height and so other totals. The
 * font size does not change: it is the root font size of the application, not a token.
 *
 * Not the default, on purpose. A 32px control and a 28px menu item are comfortable with a mouse and
 * small under a finger, so an application chooses this for the screens where it fits.
 */
export const compact: Preset = {
    semantic: {
        formField: {
            paddingX: '0.625rem',
            paddingY: '0.375rem'
        },
        list: {
            option: {
                padding: '0.375rem 0.625rem'
            }
        },
        navigation: {
            item: {
                padding: '0.375rem 0.625rem'
            }
        }
    },
    components: {
        datatable: {
            headerCell: {
                padding: '0.5rem 0.75rem'
            },
            bodyCell: {
                padding: '0.5rem 0.75rem'
            },
            footerCell: {
                padding: '0.5rem 0.75rem'
            }
        },
        card: {
            body: {
                padding: '1rem'
            }
        }
    }
};

export default definePreset<Preset>(Lux, compact);
