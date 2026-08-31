# angulux — Provenance & License Record

> The record of where this code came from. **This is a legal document.** Every change to it
> needs a stated reason.
> Last updated: 2026-08-26

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

| Artifact | Last MIT **stable** | First commercial **stable** |
|---|---|---|
| `primeng` | 21.1.9 | **22.0.0** (2026-07-15) |
| `@primeuix/utils` | 0.7.2 | **0.8.0** |
| `@primeuix/styled` | 0.7.4 | **1.0.0** |
| `@primeuix/styles` | 2.0.3 | **3.0.0** |
| `@primeuix/themes` | 2.0.3 | **3.0.0** |
| `@primeuix/motion` | 0.1.1 — but see the note below | **1.0.0** |
| `primeicons` | 7.0.0 | **8.0.0** |
| `@primeui/license-manager` | none, at any version | every version |
| `@primeicons/angular` | `8.0.0-beta.1` — a prerelease | `8.0.0-rc.1`; treated as **every version** |

**Why the columns say "stable".** Re-verified against the registry on 2026-08-26. PrimeTek did
not flip the licence at the stable release — they flipped it at the **`-rc.1` prerelease** of
every package, on 2026-06-28 (2026-07-02 for `@primeuix/utils`), and shipped the stable weeks
later. Semver orders `0.8.0-rc.1` *below* `0.8.0`, so a naive comparison would wave through
the very first commercial artifact PrimeTek published. `detect.mjs` strips the prerelease
suffix before comparing for exactly that reason, and every version at or above a row's stable
boundary — prereleases of it included — is treated as commercial.

**`@primeicons/angular` is over-flagged on purpose.** Eleven prereleases, `8.0.0-alpha.1`
through `8.0.0-beta.1`, ship a full MIT LICENSE under PrimeTek's copyright; this was checked
by reading the file out of the tarballs, not by trusting registry metadata. The guard still
refuses the package at every version. Relaxing it would loosen a legal check to gain access to
a package angulux does not use — the trade is one-sided, so the list keeps the safe side and
the record keeps the true statement.

**`@primeuix/motion` has two different "last MIT" answers.** `0.1.1` (2026-02-25) is the last
MIT release PrimeTek published. `0.0.10` is the last one **this fork can reach**: `primeng@21.1.9`
depends on `@primeuix/motion@^0.0.10`, and a leading-zero caret cannot cross into `0.1.x`.
`0.0.10` is therefore what the offline archive holds, and it is the right artifact — the two
sentences are not interchangeable, and the archive tool says which one it means.

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
- Installing a commercial release anywhere it can be built, imported, or published from.

**The one carve-out, and its price.** A commercial release may sit in `ref/` — and nowhere
else — provided it is never built against, never imported, and never read at the code level.
This exists because `ref/` is the repository's evidence shelf, not its supply chain: it is
gitignored, absent from every lockfile, and absent from CI.

The carve-out is not a relaxation, because it costs more than deleting the directory would.
Anything parked there **must be entered in the register in section 7**, and
`tools/check-prime-license.mjs` fails the build when the register and the disk disagree in
*either* direction — undeclared material, or a declared row describing something no longer
present. An unopened commercial install is a defensible thing to keep. An unrecorded one is
not, and this repository will not build with one.

What the carve-out still does not permit is any use of the material. Parking it is allowed;
reading it is the red line in section 3, and that line does not move.

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
| `packages/angulux/src/**` | the 65 modules in the transitive closure — component code |
| `packages/angulux/attic/**` | 52 modules outside the closure, kept verbatim, excluded from the build |

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
| `check:license` | a commercially licensed PrimeTek package reaching the dependency tree, **and** any licence-flagged material in `ref/` that section 7 does not declare (in either direction — undeclared material, or a declared row that is no longer on disk) |
| `check:scope` | the transitive closure drifting from the agreed 65 modules |
| `check:module-counts` | the shipped/attic/upstream counts drifting in prose — including the "of 117" figure, which is a claim about **upstream** software and stops being true the moment an attic module is deleted rather than promoted |
| `check:catalog` | versions drifting out of the pinned catalog, and the forked family being referenced from a registry instead of the workspace |
| `check:names` | leftover PrimeNG names in selector, API or trademark positions — including the forms that live **inside strings**, which TypeScript never reports |
| `check:risk-coverage` | the browser gate's scope drifting from the risky decorator set recomputed from source |
| `check:language` | Vietnamese reaching the public repository, accented or not |

`postbuild` additionally refuses to emit an artifact that is missing `LICENSE` or `NOTICE`,
that still contains pnpm-only protocols (`catalog:` / `workspace:`, which npm and yarn do
not understand), or that carries publish-trap metadata — a wrong `license`, a `restricted`
access level, an empty `repository`, or a non-English description. Publishing cannot be
undone with git, so all of these fail the build instead.

## 7. Quarantined reference material

Everything in `ref/` that `tools/check-prime-license.mjs` flags is listed here. The gate reads
this table back and fails the build if the disk and this register disagree in either
direction, so the list below is not a description of the quarantine — it *is* the quarantine.

Two things this table is careful not to conflate. The **Guard** column records what the
licence guard mechanically concluded; the **Verified licence** column records what a human
read in the package's own `LICENSE` file or on the registry. They disagree on purpose: the
guard fails closed, so a PrimeTek package its boundary table has never seen is reported
`unverified`, which is a statement about the table and not about the package. `@primeuix/mcp`
is MIT and still appears here for exactly that reason.

| Location | Package | Version | Guard | Verified licence |
|---|---|---|---|---|
| `ref/primeng` | `@primeuix/mcp` | `1.0.1` | unverified | **MIT** — registry metadata, checked 2026-07-27 |
| `ref/primeng.dev` | `primeng` | `22.0.0` | commercial | PrimeUI commercial |
| `ref/primeng.dev` | `@primeui/license-manager` | `1.0.0` | commercial | PrimeUI commercial |
| `ref/primeng.dev` | `@primeicons/angular` | `8.0.0` | commercial | PrimeUI commercial |
| `ref/primeng.dev` | `@primeicons/core` | `8.0.0` | unverified | **PrimeUI commercial** — `LICENSE.md` read by hand 2026-07-27 |
| `ref/primeng.dev` | `@primeuix/motion` | `1.0.0` | commercial | PrimeUI commercial |
| `ref/primeng.dev` | `@primeuix/styled` | `1.0.0` | commercial | PrimeUI commercial |
| `ref/primeng.dev` | `@primeuix/styles` | `3.0.0` | commercial | PrimeUI commercial |
| `ref/primeng.dev` | `@primeuix/utils` | `0.8.0` | commercial | PrimeUI commercial |

### `ref/primeng` — the MIT evidence clone

A `--depth 1` checkout of tag `21.1.9`, with nothing installed. Only its committed lockfile is
read here, and the single row above comes from a devDependency of PrimeTek's own repository,
not from anything angulux inherited. No action: it is MIT.

### `ref/primeng.dev` — a commercial install, kept unopened

A bare `npm install primeng@^22` — roughly 84 MB as first created on 2026-07-27, and 26 MB
when restored by the peer-free command below — made to see how PrimeNG's own v22 release
approached Angular 22. **It cannot serve that purpose, and the attempt was abandoned on
2026-07-27.** The published package contains zero `.ts` sources — only `.d.ts` and compiled
`.mjs` — so the only route to the information runs through decompiling or un-minifying
compiled output, which section 3 forbids outright. There is nothing to learn here that is
lawful to learn.

It is retained as licensing evidence: it is the artifact behind the boundary claims in
section 3, and re-verifying those claims against a live install is cheaper than re-deriving
them. Reading it at the code level remains prohibited; it is a specimen, not a source.

**Restoring it in a fresh clone.** `ref/` is gitignored, so a new working copy has none of
this, and the two `git clone` lines in `.gitignore` rebuild only the first two directories.
Restoring just those turns `ref-quarantine` red — correctly, because the register above then
declares eight rows that are not on disk. The third directory is rebuilt with:

```bash
mkdir -p ref/primeng.dev
cd ref/primeng.dev
printf '{"name":"primeng-dev-specimen","version":"0.0.0","private":true}\n' > package.json
npm install --legacy-peer-deps \
    primeng@22.0.0 \
    @primeui/license-manager@1.0.0 \
    @primeicons/angular@8.0.0 \
    @primeicons/core@8.0.0 \
    @primeuix/motion@1.0.0 \
    @primeuix/styled@1.0.0 \
    @primeuix/styles@3.0.0 \
    @primeuix/utils@0.8.0
```

Two traps, both of which have already been hit:

- **The local `package.json` is required, not tidiness.** Without it, npm walks up the tree,
  finds the workspace root manifest, and dies on `EUNSUPPORTEDPROTOCOL — Unsupported URL Type
  "catalog:"`. The local manifest stops that walk, and marking it `private` is what keeps the
  specimen out of the workspace it is quarantined from.
- **`--legacy-peer-deps` keeps Angular out of the directory.** A specimen with no peers
  installed is a specimen that cannot be built against, which is the state section 3 requires.

**Every version is pinned, and that is new.** The command used to be a bare
`npm install primeng@22.0.0`, relying on `primeng@22.0.0` declaring its `@primeuix/*` and
`@primeicons/*` dependencies as `^` ranges that happened to resolve to the eight versions in
the register. This entry warned that the arrangement would break on the next PrimeTek minor.
**It broke.** Measured 2026-08-26: `primeng` is now `22.1.0` and `@primeuix/utils` is now
`0.8.1`, so the old command puts `@primeuix/utils@0.8.1` on disk while the register above
declares `0.8.0` — and `ref-quarantine` fails a fresh clone, correctly, for a disagreement
nobody introduced. The versions are pinned individually now, which is what should have been
written the first time a legal register was reproduced by a floating range.

Nothing on disk moved, and no claim in the register changed. What was repaired is the
**instruction for rebuilding the evidence**, which had quietly stopped producing the evidence
it describes.

**Re-report trigger.** Revisit this entry when any of the following happens:

- the repository begins accepting outside contributors — an unopened commercial install is
  defensible for a maintainer who can attest to it, and much harder to attest to for a team;
- PrimeTek publishes a new release of any `prime*` package that changes the versions above —
  note this now fires on a **minor**, not only a major, which is the lesson of 2026-08-26;
- the register goes stale for any other reason, which the gate will report before a human
  notices.

Absent one of those, the correct action remains: leave it closed.
