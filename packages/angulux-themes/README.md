# angulux-themes

Theme presets for angulux. Two ship today: **Lux**, the default, and **Lux Compact**, the same
preset with less padding.

```ts
import { provideAngulux } from '@anguless/angulux/config';
import Lux from '@anguless/angulux-themes/lux';

bootstrapApplication(App, {
    providers: [provideAngulux({ theme: { preset: Lux } })]
});
```

Part of [angulux](https://github.com/anguless-com/angulux). Published so that a styled
angulux application needs no package whose upstream has moved to a commercial license.

## What Lux changes

Lux starts from the Aura preset and keeps its token names, so an override written for Aura
applies to Lux unchanged. It differs in two things.

**The colours that carry text.**

- **Light scheme.** A solid button, a badge, and the text of an outlined button, a text
  button, a message, a toast and an unchecked toggle button all use a palette step dark
  enough for 4.5:1 against the colour they sit on. In Aura, white text on the six solid
  fills measures between 2.28:1 and 3.96:1.
- **Dark scheme.** The info and error text of a message and a toast move one step lighter.
  Nothing else in the dark scheme changes.

**The shape** (since 1.4).

| | Aura | Lux |
|---|---|---|
| Field, button, message, tag | 6px corners | 8px |
| An option in a list, an item in a menu | 4px | 6px |
| The list of a select, a popover, a menu | 6px | 8px |
| Dialog | 12px | 16px |
| Checkbox | 4px | 5px |
| Focus ring | 1px | 2px |
| Card | two drop shadows | a 1px line, no shadow |
| Shadow under a floating layer | close and dark | wide and faint |

Heights do not change: a field, a button, a select and a table row are exactly as tall in
Lux as in Aura, so an application that moves from one to the other keeps its layout.

The contrast of each severity and the numbers in the table above for everything that does not
float are measured in a browser on every build of this repository (`e2e/contrast.spec.ts`,
`e2e/lux-shape.spec.ts`). The floating layers are not measured there.

## Lux Compact

```ts
import LuxCompact from '@anguless/angulux-themes/lux-compact';

provideAngulux({ theme: { preset: LuxCompact } });
```

Lux with less padding, for screens that are mostly tables and forms. A field, a button and a
select are 4px shorter than in Lux, and a table row 8px shorter. With the system font of macOS
that is 32px instead of 36px, and 42px instead of 50px; the totals depend on the line height
of your font, the differences do not. Colours, corners and shadows are Lux's. The font size is
not a token: it is the root font size of your application.

It is not the default, on purpose. A control that short is comfortable with a mouse and small
under a finger, so choose it for the screens where it fits.

The overrides are exported on their own, to layer on a preset you defined:

```ts
import { definePreset } from '@anguless/angulux-themes';
import { compact } from '@anguless/angulux-themes/lux-compact';

export const BrandCompact = definePreset(Brand, compact);
```

## Customising

`definePreset` takes a preset and the tokens you want to change. Everything you do not name is
inherited.

```ts
import { definePreset } from '@anguless/angulux-themes';
import Lux from '@anguless/angulux-themes/lux';

export const Brand = definePreset(Lux, {
    semantic: {
        primary: { 500: '{indigo.500}', 600: '{indigo.600}', 700: '{indigo.700}', 800: '{indigo.800}', 900: '{indigo.900}' }
    }
});
```

The token types are exported from `@anguless/angulux-themes/types`.

## Provenance

Derived from the Aura preset of `@primeuix/themes`, MIT, at the final public commit of
[primefaces/primeuix](https://github.com/primefaces/primeuix) (`b9467bc`, repository
archived 2026-06-28\), which published as `@primeuix/themes 2.0.3`.

Unlike its sibling packages, this one is **not** a complete copy of that release. The Lara,
Nora and Material presets, the UMD builds and the generated token catalogue are not here.
If you need one of those presets, `@primeuix/themes@2.0.3` is MIT and still works with
angulux: pin it exactly, because `3.0.0` is the first commercial release.

This package is versioned **independently of angulux**. angulux locks its major to Angular's,
but nothing here depends on Angular, so tying these versions to an Angular release would
claim a relationship that does not exist. The lineage lives in this file and in
`PROVENANCE.md`, not in the version number.

## License

MIT. See `LICENSE` and the repository's `NOTICE`. angulux is not affiliated with,
endorsed by, or sponsored by PrimeTek.
