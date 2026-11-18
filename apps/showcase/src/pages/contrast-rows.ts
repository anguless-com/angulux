/**
 * The contrast table on the Theming guide.
 *
 * Kept apart from the page, with no framework import, so that e2e/contrast.spec.ts can read it too.
 * That test renders each row in a browser, in the stock preset and in the override the guide
 * prints, and requires both ratios below to be the ones it measures. A number changed here without
 * the colours changing turns the browser gate red, and so does the reverse.
 *
 * `part` and `text` say which text node on the measured page (apps/verify/src/contrast.ts) a row
 * stands for. The page does not show them.
 */
export interface ContrastRow {
    /** What a reader sees failing. */
    where: string;
    scheme: 'light' | 'dark';
    /** The palette step the stock preset uses, and the ratio it gives. */
    stock: string;
    stockRatio: number;
    /** The step the override moves it to, and the ratio that gives. */
    override: string;
    overrideRatio: number;
    part: string;
    text: string;
}

export const CONTRAST_ROWS: ContrastRow[] = [
    { where: 'primary fill', scheme: 'light', stock: 'emerald.500', stockRatio: 2.54, override: 'emerald.700', overrideRatio: 5.48, part: 'p-button-label', text: 'primary' },
    { where: 'success fill', scheme: 'light', stock: 'green.500', stockRatio: 2.28, override: 'green.700', overrideRatio: 5.02, part: 'p-button-label', text: 'success' },
    { where: 'info fill', scheme: 'light', stock: 'sky.500', stockRatio: 2.77, override: 'sky.700', overrideRatio: 5.93, part: 'p-button-label', text: 'info' },
    { where: 'warn fill', scheme: 'light', stock: 'orange.500', stockRatio: 2.8, override: 'orange.700', overrideRatio: 5.18, part: 'p-button-label', text: 'warn' },
    { where: 'danger fill', scheme: 'light', stock: 'red.500', stockRatio: 3.76, override: 'red.600', overrideRatio: 4.83, part: 'p-button-label', text: 'danger' },
    { where: 'help fill', scheme: 'light', stock: 'purple.500', stockRatio: 3.96, override: 'purple.600', overrideRatio: 5.38, part: 'p-button-label', text: 'help' },
    { where: 'success message text', scheme: 'light', stock: 'green.600', stockRatio: 3.16, override: 'green.700', overrideRatio: 4.8, part: 'p-message-text', text: 'success message' },
    { where: 'warn message text', scheme: 'light', stock: 'yellow.600', stockRatio: 2.85, override: 'yellow.700', overrideRatio: 4.77, part: 'p-message-text', text: 'warn message' },
    { where: 'error message text', scheme: 'light', stock: 'red.600', stockRatio: 4.43, override: 'red.700', overrideRatio: 5.94, part: 'p-message-text', text: 'error message' },
    { where: 'toggle button label, off', scheme: 'light', stock: 'surface.500', stockRatio: 4.34, override: 'surface.600', overrideRatio: 6.92, part: 'p-togglebutton-label', text: 'No' },
    { where: 'info message text', scheme: 'dark', stock: 'blue.500', stockRatio: 3.96, override: 'blue.400', overrideRatio: 5.73, part: 'p-message-text', text: 'info message' },
    { where: 'error message text', scheme: 'dark', stock: 'red.500', stockRatio: 3.98, override: 'red.400', overrideRatio: 5.42, part: 'p-message-text', text: 'error message' }
];
