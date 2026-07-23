# angulux — Provenance & License Record

> The record of where this code came from. **This is a legal document.** Every change to it
> needs a stated reason.
> Last updated: 2026-07-23

## 1. Summary

`angulux` is a fork of PrimeNG, taken from the last release that was still MIT licensed.
The fork is lawful under the MIT terms, which grant the right to "use, copy, modify, merge,
publish, distribute, sublicense, and/or sell".

MIT's only obligation is to **retain the copyright notice and the permission notice**. That
obligation is met by the `LICENSE` file at the repository root, by `NOTICE`, and by section
5 below.

## 2. Exact origin (verified 2026-07-23)

| Source | Ref | Commit | Commit date | License |
|---|---|---|---|---|
| `github.com/primefaces/primeng` | tag `21.1.9` | `c493b1c6d9f7cdffbe1c4dc195493dd73d733593` | 2026-06-04 | MIT |
| `github.com/primefaces/primeuix` | `master` | `b9467bc448d35738d4f651dbc3caa4d4cb9a6a96` | 2026-06-29 | MIT |

Unmodified checkouts of both live in `ref/`, **read-only, never edited**. `ref/` is not
committed; the two clone commands that reproduce it are recorded in `.gitignore`.

### Offline archive (the stronger evidence)

`ref/` is a **single-commit shallow clone** of a repository that has since been **archived**
(`primefaces/primeng`, archived 2026-06-28). If the MIT lineage ever has to be proven, that
is weak evidence — so every still-MIT registry artifact was archived offline instead:

- `provenance/manifest.json` — 8 artifacts with their **SHA-256 checksums**, the integrity
  hash the registry published, and the **registry's own publish timestamp**. This file is
  committed publicly; **it is the evidence.**
- The tarballs themselves are **not** in the public repository. `primeng-21.1.9.tgz` ships a
  `package/LICENSE.md` containing the proprietary **"PRIMENG LTS VERSIONS LICENSE"** section
  alongside the MIT one, so republishing it would make every license scanner flag this
  project for no benefit. They are kept in a private evidence store; point at it with the
  `ANGULUX_PROVENANCE_TARBALLS` environment variable.
- **Anyone can rebuild the archive and verify it independently** — no need to take our word:

  ```
  node tools/provenance/archive-mit.mjs            # re-download the 8 artifacts from the registry
  node tools/provenance/archive-mit.mjs --verify   # compare against the committed manifest
  ```

  If the checksums match, the artifact you just downloaded from npm is byte-identical to the
  one angulux inherited. That is stronger evidence than us hosting our own copies.

Independently verified: **all 8 tarballs contain the MIT license text inside them**, under
PrimeTek's copyright. That holds up under questioning without depending on what GitHub or
npm still keep online.

### Verified findings

- `ref/primeng/LICENSE.md`, section *"PRIMENG COMMUNITY VERSIONS LICENSE"* is MIT,
  `Copyright (c) 2016-2026 PrimeTek`. The file is **identical** between tag `21.1.9` and
  `master`.
- All 10 packages in `ref/primeuix/packages/*` declare `license: MIT` and carry their own
  MIT `LICENSE` file. Versions at that commit: `styled 0.7.4`, `styles 2.0.3`,
  `themes 2.0.3`, `utils 0.6.4`, `motion 0.0.11`.

## 3. The red line — never cross it

PrimeTek moved to the commercial "PrimeUI" license (announced at `primeui.dev/nextchapter`).
The artifacts below are **not MIT** and must **never be copied, decompiled, or referenced at
the code level** in angulux:

| Artifact | Last MIT release | First commercial release |
|---|---|---|
| `primeng` | 21.1.9 | **22.0.0** (2026-07-15) |
| `@primeuix/utils` | 0.7.2 | **0.8.0** |
| `@primeuix/styled` | 0.7.4 | **1.0.0** |
| `@primeuix/styles` | 2.0.3 | **3.0.0** |
| `@primeuix/themes` | 2.0.3 | **3.0.0** |
| `primeicons` | 7.0.0 | **8.0.0** |
| `@primeui/license-manager` | — | every version |
| `@primeicons/angular` | — | every version |

Additionally, every PrimeNG tag or branch with an **`-lts`** suffix falls under a separate
proprietary license (the *"PRIMENG LTS VERSIONS LICENSE"* section), which states plainly
that you *"cannot distribute modifications (derivative works)"*. **Do not touch them.**

A practical note: `primeng@22.0.0` ships compiled files only (`.mjs` + `.d.ts`, **zero `.ts`
sources**), and the v22 source was never pushed to GitHub — the public repository stopped at
`21.1.9`. Copying v22 code would be both unlawful and impossible.

## 4. Upstream tracking rules

After 21.1.9 the relationship with PrimeNG changes from **code synchronisation** to
**roadmap signal**.

**Allowed:**
- Reading `primeng.dev` (the public documentation), changelogs and release notes.
- Observing component behaviour through public demos.
- Noting that "PrimeNG added feature X" and then **designing and writing X yourself**.

**Not allowed:**
- Copying any code from `primeng` >= 22 or from any commercial `@primeuix/*` version.
- Decompiling, un-minifying, or transcribing compiled `.mjs` back into source.
- Installing a commercial release into this repository in any form, including "just to look
  at it".

Any feature ported from an upstream signal must record it in the commit message:
`upstream-signal: <link to public docs>` — **never** a link to source code.

## 5. Required copyright notice

Code originating from PrimeNG and primeuix carries:

```
The MIT License (MIT)
Copyright (c) 2016-2026 PrimeTek
```

That notice lives in `LICENSE` at the repository root and must not be removed, no matter how
far angulux diverges from its origin. `NOTICE` carries the attribution and the statement
that angulux is not affiliated with, endorsed by, or sponsored by PrimeTek.

## 6. Divergence — what is inherited and what is original

This boundary matters legally: MIT permits derivative works but requires the copyright
notice to be kept for the **inherited** portion. Recording the boundary now means nobody has
to reconstruct it later.

**Inherited from `primeng@21.1.9` (MIT, notice retained in `LICENSE`):**

| Path | Contents |
|---|---|
| `packages/angulux/src/**` | the 64 modules in the transitive closure — component code |
| `packages/angulux/attic/**` | 53 modules outside the closure, kept verbatim, excluded from the build |

**Forked from `primeuix` (MIT, same notice):**

| Path | Upstream |
|---|---|
| `packages/angulux-utils/**` | `@primeuix/utils` |
| `packages/angulux-styled/**` | `@primeuix/styled` |
| `packages/angulux-styles/**` | `@primeuix/styles` |
| `packages/angulux-motion/**` | `@primeuix/motion` |

The inherited code has been through the following mechanical transformations:
`p-*` -> `agl-*` and `primeng/*` -> `angulux/*` · an explicit change-detection strategy
declared on all 126 `@Component` decorators · the hard font-icon dependency replaced with
internal SVG components · `peerDependencies` widened to Angular 22 and `@angular/cdk`
dropped · PrimeTek trademarks removed from the public API surface.

**Original (no PrimeTek copyright):**

| Path | Role |
|---|---|
| `tools/check-prime-license.mjs` | the license guard — a thin delegate to `packages/angulux-license-guard/` |
| `packages/angulux-license-guard/src/boundary.mjs` | **the boundary record itself** — `FIRST_COMMERCIAL`, `ALWAYS_COMMERCIAL`, `TABLE_VERIFIED`; declared exactly once, enforced by test |
| `tools/check-catalog.mjs` | version discipline in the workspace catalogs |
| `tools/check-language.mjs` | the English-only guard, accented and unaccented detectors |
| `tools/scope/gen-closure.mjs` | transitive closure generator (BFS over the import graph) |
| `tools/scope/check-risk-coverage.mjs` | reconciles the browser gate's scope with the risky decorator set recomputed from source |
| `tools/codemod/*.mjs` | the rename and change-detection codemods, and the leftover-name scanner |
| `tools/provenance/archive-mit.mjs` | offline archive of the 8 MIT tarballs with SHA-256 |
| `tools/build/*.mjs` | the packaging pipeline |
| `apps/verify/**` | the verification app — substrate for the mandatory browser gate |
| `e2e/**` | Playwright harness plus the verification scenarios and the `risk-coverage.json` scope manifest |

**Guards that run** (`npm run check` invokes all of them):

| Command | What it blocks |
|---|---|
| `check:license` | a commercially licensed PrimeTek package reaching the dependency tree |
| `check:scope` | the transitive closure drifting from the agreed 64 modules |
| `check:catalog` | versions drifting out of the pinned catalog, and the forked family being referenced from a registry instead of the workspace |
| `check:names` | leftover PrimeNG names in selector, API or trademark positions — including the forms that live **inside strings**, which TypeScript never reports |
| `check:risk-coverage` | the browser gate's scope drifting from the risky decorator set recomputed from source |
| `check:language` | Vietnamese reaching the public repository, accented or not |

`postbuild` additionally refuses to emit an artifact that is missing `LICENSE` or `NOTICE`,
that still contains pnpm-only protocols (`catalog:` / `workspace:`, which npm and yarn do
not understand), or that carries publish-trap metadata — a wrong `license`, a `restricted`
access level, an empty `repository`, or a non-English description. Publishing cannot be
undone with git, so all of these fail the build instead.
