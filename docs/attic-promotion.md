# Promoting a module out of `attic/`

This library ships **65** of PrimeNG's 117 modules. The other **52** are inherited verbatim
from PrimeNG 21.1.9 and live in [`packages/angulux/attic/`](../packages/angulux/attic/):
the source is kept, the build excludes them. That is documented behaviour rather than a gap —
the warranted set is the transitive closure of what a real application actually imported, and
everything outside it was cut so that the guarantee could mean something.

Promoting one is the most useful contribution this project can receive. This page exists so
the choice can be made on cost rather than on whichever component someone happened to notice.

## How to read the table

- **Drags in** — other attic modules the promotion pulls with it. Only three drag anything;
  the dependency graph out here is unusually flat.
- **Cost notes** — everything that makes a promotion more than move-rename-regenerate. This
  column is the point of the table.
- **LOC / Spec** — source lines excluding specs, and the inherited spec lines that come with
  it. No inherited spec means writing tests from scratch, which is usually the larger job.
- **Risky** — `@Component`s declaring `ChangeDetectionStrategy.Eager`/`.Default`. Each one has
  to be reached by the browser gate or `check:risk-coverage` fails, correctly.

## The checklist

From [the promotion issue template](../.github/ISSUE_TEMPLATE/module_promotion.yml):

1. Move `attic/<name>/` → `src/<name>/`.
2. Rename selectors to `agl-*` / `agl*`. **CSS class names `p-*` stay** — see [NOTICE](../NOTICE).
3. Regenerate the closure (`node tools/scope/gen-closure.mjs`) and include the diff.
4. `npm run check` green, the module's inherited specs passing, and `npm run test:tools`.
5. If the module carries a risky decorator, extend the browser gate.
6. Move every counted claim by one: the module-count assertions `npm run test:tools`
   checks, the `corpusSourceHash` in the MCP benchmark, this page (regenerate it, do
   not edit it), and the prose counts in the README and the issue templates.

Two traps worth knowing before you start. The attic is **un-renamed** — its imports still say
`primeng/*` — so the rename codemod has to run over it. And a promotion may need upstream
attribute names added to `selectors.json`, or `check:names` stays blind to them in templates.

## All 52, cheapest first

| Module | Drags in | Cost notes | LOC | Spec | Risky |
|---|---|---|---:|---:|---:|
| `classnames` | — | — | 38 | 321 | — |
| `inputgroupaddon` | — | — | 76 | 313 | — |
| `floatlabel` | — | — | 107 | 610 | — |
| `inputgroup` | — | — | 131 | 465 | — |
| `toolbar` | — | — | 174 | 838 | — |
| `animateonscroll` | — | — | 177 | 708 | — |
| `imagecompare` | — | — | 187 | 786 | — |
| `terminal` | — | — | 244 | 1298 | — |
| `blockui` | — | — | 250 | 1056 | — |
| `inplace` | — | — | 268 | 1661 | — |
| `keyfilter` | — | — | 294 | 740 | — |
| `scrolltop` | — | — | 305 | 1429 | — |
| `styleclass` | — | — | 338 | 1100 | — |
| `breadcrumb` | — | — | 365 | 1345 | — |
| `rating` | — | — | 381 | 1474 | — |
| `fieldset` | — | — | 400 | 1249 | — |
| `metergroup` | — | — | 415 | 923 | — |
| `editor` | — | runtime `quill` via dynamic import, undeclared | 465 | 1308 | — |
| `inputotp` | — | — | 465 | 921 | — |
| `knob` | — | — | 472 | 1222 | — |
| `organizationchart` | — | — | 483 | 1105 | 2 |
| `panel` | — | — | 499 | 1382 | — |
| `dock` | — | — | 537 | 1396 | — |
| `scrollpanel` | — | — | 585 | 1017 | — |
| `splitter` | — | — | 612 | 1030 | — |
| `dataview` | — | — | 643 | 1740 | — |
| `confirmpopup` | — | — | 689 | 1886 | — |
| `accordion` | — | — | 695 | 1018 | — |
| `image` | — | spec dynamic-imports `primeng/config` as a string | 717 | 1051 | — |
| `slider` | — | — | 796 | 1535 | — |
| `stepper` | — | — | 802 | 788 | — |
| `speeddial` | — | — | 866 | 2141 | — |
| `dynamicdialog` | — | — | 1150 | 1013 | 1 |
| `carousel` | — | — | 1180 | 1366 | — |
| `panelmenu` | — | — | 1400 | 1402 | — |
| `menubar` | — | — | 1404 | 1390 | — |
| `megamenu` | — | — | 1479 | 1731 | — |
| `contextmenu` | — | — | 1488 | 1602 | — |
| `inputmask` | — | — | 1545 | 2055 | — |
| `cascadeselect` | — | — | 1739 | 2090 | — |
| `galleria` | — | — | 1931 | 1287 | — |
| `tree` | — | — | 2076 | 2931 | — |
| `autocomplete` | — | — | 2085 | 2641 | — |
| `passthrough` | — | **no inherited spec** | 17 | — | — |
| `buttongroup` | — | **no inherited spec** | 97 | — | — |
| `overlaybadge` | — | **no inherited spec** | 135 | — | — |
| `dragdrop` | — | **no inherited spec** | 304 | — | — |
| `steps` | — | **no inherited spec** | 372 | — | — |
| `listbox` | — | needs `@angular/cdk` | 1910 | 2809 | — |
| `treeselect` | `tree` | — | 3305 | 4476 | — |
| `orderlist` | `listbox` | needs `@angular/cdk` | 2919 | 4711 | — |
| `picklist` | `listbox` | needs `@angular/cdk` | 3810 | 4667 | — |

## Summary

- **41 of 52** drag nothing, need no external dependency, and arrive with an
  inherited spec suite. Those are move-rename-regenerate jobs.
- **5** have no inherited spec — `passthrough`, `buttongroup`, `overlaybadge`, `dragdrop`, `steps`. Budget for writing tests.
- **3** need `@angular/cdk`, a peer this project dropped deliberately (`listbox`, `orderlist`, `picklist`). Reinstating it is a scope decision,
  not a promotion.
- **1** carry a runtime dependency loaded by dynamic `import()`, which
  no static scan and no manifest declares. `editor` is the case: it does `import('quill')`,
  and nothing in this workspace mentions Quill — promoting it without adding a peer dependency
  ships a component that fails the first time a user opens it.
- **1** dynamic-import an un-renamed `primeng/*` path **from inside the
  inherited spec** (`image`). No
  source file does this. A rename codemod matching syntax cannot see a string and neither can
  the type checker, so the spec breaks after promotion — cheaper than the same bug in shipped
  code, because it fails immediately, but worth knowing before a green codemod is read as a
  green module.

<!-- Generated by tools/community/survey-attic.mjs. Do not edit this table by hand: run
     node tools/community/survey-attic.mjs after a promotion and commit the diff. Every
     number on this page comes off the filesystem, which is why none of them is written by
     hand. -->
