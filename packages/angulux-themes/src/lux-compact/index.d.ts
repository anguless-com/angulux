import type { LuxBaseDesignTokens } from '@anguless/angulux-themes/lux/base';
import type { Preset } from '@anguless/angulux-themes/types';

/**
 * The overrides that turn Lux into Lux Compact: less padding in fields, list options, menu items,
 * table cells and cards. Exported so they can be layered on a preset of your own:
 * `definePreset(Brand, compact)`.
 */
export declare const compact: Preset;

/**
 *
 * _Lux Compact Preset_
 *
 * Lux with less padding, for screens that are mostly tables and forms.
 *
 * @group presets
 * @module lux-compact
 *
 */
declare const _default: Preset<LuxBaseDesignTokens>;
export default _default;
