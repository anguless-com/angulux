import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/*
 * The preset the Theming guide tells readers to copy, and the one it tells them not to.
 *
 * The region between the two `guide:` marks is cut out by apps/showcase/scripts/guide-snippets.mjs
 * and printed on the guide, character for character. So the code a reader copies is the code
 * e2e/contrast.spec.ts measured in a browser, and the two cannot drift apart.
 */

// guide:contrast:start
// Solid fills: the step each palette needs before white text on it reaches 4.5:1,
// with hover and active one and two steps further, so neither is lighter than rest.
const fill = (palette: string, rest: number, hover: number, active: number) => ({
    background: `{${palette}.${rest}}`,
    hoverBackground: `{${palette}.${hover}}`,
    activeBackground: `{${palette}.${active}}`,
    borderColor: `{${palette}.${rest}}`,
    hoverBorderColor: `{${palette}.${hover}}`,
    activeBorderColor: `{${palette}.${active}}`
});

// Coloured text on a white or tinted background.
const ink = (color: string) => ({ color });
const message = (color: string) => ({ color, outlined: { color }, simple: { color } });

// Everything sits under colorScheme.light, except the last block. The dark scheme
// reads the same palette steps as TEXT on a dark surface, so an override that is
// not scoped to light makes dark mode worse.
export const Accessible = definePreset(Aura, {
    semantic: {
        colorScheme: {
            light: {
                primary: { color: '{primary.700}', hoverColor: '{primary.800}', activeColor: '{primary.900}' }
            }
        }
    },
    components: {
        button: {
            colorScheme: {
                light: {
                    root: {
                        success: fill('green', 700, 800, 900),
                        info: fill('sky', 700, 800, 900),
                        warn: fill('orange', 700, 800, 900),
                        help: fill('purple', 600, 700, 800),
                        danger: fill('red', 600, 700, 800)
                    },
                    outlined: {
                        success: ink('{green.700}'),
                        info: ink('{sky.700}'),
                        warn: ink('{orange.700}'),
                        help: ink('{purple.600}'),
                        danger: ink('{red.600}')
                    },
                    text: {
                        success: ink('{green.700}'),
                        info: ink('{sky.700}'),
                        warn: ink('{orange.700}'),
                        help: ink('{purple.600}'),
                        danger: ink('{red.600}')
                    }
                }
            }
        },
        badge: {
            colorScheme: {
                light: {
                    success: { background: '{green.700}' },
                    info: { background: '{sky.700}' },
                    warn: { background: '{orange.700}' },
                    danger: { background: '{red.600}' }
                }
            }
        },
        message: {
            colorScheme: {
                light: {
                    success: message('{green.700}'),
                    warn: message('{yellow.700}'),
                    error: message('{red.700}')
                },
                // Dark: only info and error fall short, and only over a card.
                dark: { info: message('{blue.400}'), error: message('{red.400}') }
            }
        },
        toast: {
            colorScheme: {
                light: {
                    success: ink('{green.700}'),
                    warn: ink('{yellow.700}'),
                    error: ink('{red.700}')
                },
                dark: { info: ink('{blue.400}'), error: ink('{red.400}') }
            }
        },
        togglebutton: {
            colorScheme: {
                light: { root: { color: '{surface.600}' }, icon: { color: '{surface.600}' } }
            }
        }
    }
});
// guide:contrast:end

/*
 * What the guide printed before: the same fix made on the primitive palette. It is shorter, and in
 * light mode it works. A primitive has no colour scheme, though, so the dark scheme reads the
 * darkened steps too. Kept so that e2e/contrast.spec.ts can go on proving the sentence in the guide
 * that warns against it.
 */
export const PrimitiveShift = definePreset(Aura, {
    primitive: {
        emerald: { 500: '#047857', 600: '#065f46', 700: '#064e3b' },
        green: { 500: '#15803d', 600: '#166534', 700: '#14532d' },
        sky: { 500: '#0369a1', 600: '#075985', 700: '#0c4a6e' },
        orange: { 500: '#c2410c', 600: '#9a3412', 700: '#7c2d12' },
        red: { 500: '#dc2626', 600: '#b91c1c', 700: '#991b1b' },
        purple: { 500: '#9333ea', 600: '#7e22ce', 700: '#6b21a8' }
    }
});
