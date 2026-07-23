# angulux

**A curated Angular 22 UI component library, forked from the last MIT release of PrimeNG (21.1.9), with the MIT provenance proven by machine rather than asserted in prose.**

[![CI](https://github.com/anguless-com/angulux/actions/workflows/ci.yml/badge.svg)](https://github.com/anguless-com/angulux/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/angulux.svg)](https://www.npmjs.com/package/angulux)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/anguless-com/angulux/badge)](https://scorecard.dev/viewer/?uri=github.com/anguless-com/angulux)

```bash
npm install @anguless/angulux @primeuix/themes
```

```ts
import { provideAngulux } from '@anguless/angulux/config';
import Aura from '@primeuix/themes/aura';

bootstrapApplication(App, {
    providers: [provideAngulux({ theme: { preset: Aura } })]
});
```

**Why the second package.** angulux ships no theme presets of its own, so the preset comes
from `@primeuix/themes` — PrimeTek's, and MIT through `2.0.3`. angulux itself still installs
with **zero PrimeTek packages** in its dependency tree; drop the second package and
`provideAngulux()` runs unstyled but works.

It is declared as an **optional** peer ranged `^2.0.0`, and the ceiling is deliberate:
`3.0.0` is the first commercial release. Be clear about what that buys you — a peer range is
a *warning*, not a lock. `npm install @primeuix/themes@3` still succeeds; it just prints an
`ERESOLVE` warning naming the range it broke. That is enough for the case that actually
happens (a routine `npm update`, or an agent bumping dependencies, sliding across a license
boundary in silence) and it is not enough for anything else. If the boundary matters to you,
pin the version exactly and run a licence guard in your own build. That gate is published as
its own MIT package, [`angulux-license-guard`](packages/angulux-license-guard) — it reads your
lockfile, fails closed on any PrimeTek package it cannot verify, and has no dependencies of
its own. It works in any project; it does not require angulux.

---

## Read this part first

angulux is **not** a drop-in replacement for PrimeNG, and it is **not** trying to be the
community's continuation of it. Three facts decide whether you should keep reading:

1. **It ships 64 of PrimeNG's 117 modules.** Editor, Tree, OrganizationChart, PickList,
   OrderList, Listbox and 47 others are not ported — all 53 are listed in
   [`packages/angulux/attic/`](packages/angulux/attic/). See
   [What angulux is NOT](#what-angulux-is-not).
2. **Selectors were renamed.** `p-button` is `agl-button`, `pTooltip` is `aglTooltip`.
   CSS class names (`p-*`) were deliberately kept — see [NOTICE](NOTICE) for why.
3. **Bus factor is 1.** One maintainer, a permanent obligation of two Angular majors per
   year. MIT, best-effort, **no SLA**. If that is disqualifying for you, it should be.

If what you need is "I run PrimeNG 21 and I want to keep going with minimal change", the
honest answer is that [Optimus UI](https://github.com/openng-org/optimus-ui) fits that
better than angulux does: it keeps the `p-*` selectors and carries the full module set.
We would rather tell you that here than collect an issue about it later.

## Why angulux exists

PrimeNG 22 moved to a commercial license. Every release up to and including **21.1.9** was
published under MIT and stays MIT permanently — that is what a published license grant
means. angulux is a fork taken at that boundary, for teams whose blocker is **control and
legal certainty**, not price.

The interesting part is not the fork. It is that the boundary is enforced by machine.

## The three things that are actually different

### 1. Every release is machine-proven MIT

Seven gates run on every commit and every pull request. They do not check style — each one
closes a class of failure that has already happened in this repository.

| Gate | What it refuses to let through |
|---|---|
| `check:catalog` | a dependency version drifting off the pinned catalog |
| `check:scope` | the transitive closure drifting off the 64 warranted modules |
| `check:license` | any PrimeTek package from a post-MIT release entering the tree |
| `check:names` | PrimeNG names surviving in selector, API or **trademark** positions — including inside bare strings, JSDoc links and DOM attributes |
| `check:risk-coverage` | the browser gate's scope drifting off the risky decorators computed from source |
| `check:language` | non-English text reaching a public repository |
| `check:public-tree` | internal-only paths sitting in the git index (`.gitignore` does **not** untrack) |

```bash
npm run check     # all seven, ~3 seconds
```

An eighth gate, `check:publishable`, runs after the build rather than in that suite: it
packs every package and reads `package.json` back **out of the tarball**, so what gets
inspected is the exact bytes npm would receive. It exists because a guard that read the
source tree instead once passed while three packages were about to publish an
uninstallable `workspace:` dependency.

Two of the seven — `check:license` and `check:catalog` — **also run daily on a schedule**, and
that is not redundancy. A pull-request run only proves the tree was clean *at our last
commit*, while the boundary those two enforce lives outside this repository: PrimeTek
decides which of their releases is the last MIT one, and that can change on a day when
nobody here pushes anything. The other five gate our own code, so a commit is the only
moment they can be wrong.

On top of that: `provenance/manifest.json` records SHA-256 checksums and registry publish
timestamps for every archived MIT artifact, and a browser gate renders **15 of 15**
risk-flagged decorators in a real Chromium and asserts on the result — because a green
type-check cannot see a render bug.

Current evidence, reproducible from a clean checkout:

```
7/7 gates            exit 0
library build        exit 0 · 210 entrypoints
inherited spec suite 3765 SUCCESS
browser gate         13/13 passed
runtime deps         tslib + four first-party angulux-* packages. Zero PrimeTek.
```

### 2. Angular-latest-first, as a published commitment

The commitment is **a green build within 14 days of every Angular major RC**, verified by a
nightly job that builds against `@angular/core@next` and reports publicly. angulux's major
version is locked to Angular's major, so `angulux@22.x` targets Angular 22 and nothing else.

### 3. 64 warranted modules instead of 117 unverified ones

Every shipped module is inside the closure that the gates cover. The other 53 live in
[`packages/angulux/attic/`](packages/angulux/attic/) — verbatim upstream source, not built,
not published, kept in the open as a roadmap. Promoting one is a well-defined contribution; see
[CONTRIBUTING.md](CONTRIBUTING.md).

## What angulux is NOT

- **Not a drop-in replacement.** Selectors changed. A migration codemod is planned, not shipped.
- **Not feature-parity with PrimeNG.** 64 of 117 modules. Missing, among others: Editor,
  Tree, TreeSelect, OrganizationChart, PickList, OrderList, Listbox, Terminal, Dock.
  (TreeTable **is** shipped; Tree is not.)
- **Not affiliated with PrimeTek or Google.** See [NOTICE](NOTICE).
- **Not a supported product.** MIT, best-effort, no SLA, no response-time promise.
- **Not a fork made in anger.** PrimeTek gave the community ten years of MIT work and
  confirmed that past MIT releases stay MIT. This project exists because of that grant,
  not in spite of it. Keep that tone in issues and pull requests.

## Requirements

| | |
|---|---|
| Angular | `^22.0.0` |
| TypeScript | `6.0.x` (Angular 22's compiler requires `>=6.0 <6.1`) |
| Node | `>=22` |
| Package manager | pnpm 9.6.0 (via corepack) for development; any manager to consume |

`chart.js` is an optional peer, needed only by the chart module. There is no
`@angular/cdk` peer — it was dropped on purpose; nothing in the warranted closure needs it.

## Packages

| Package | Version | Purpose |
|---|---|---|
| [`angulux`](packages/angulux) | `22.x` | the component library — major locked to Angular's major |
| [`angulux-styled`](packages/angulux-styled) | `1.x` | style engine, forked from `@primeuix/styled` |
| [`angulux-utils`](packages/angulux-utils) | `1.x` | DOM/object utilities, forked from `@primeuix/utils` |
| [`angulux-styles`](packages/angulux-styles) | `1.x` | base style definitions |
| [`angulux-motion`](packages/angulux-motion) | `1.x` | animation primitives |

The four forked packages version **independently on `1.x`** — they do not depend on Angular,
so locking them to Angular's major would be a lie about their compatibility.

## Development

```bash
corepack pnpm install
npm run check                                   # the seven gates

# the four forked packages build BEFORE the library — dependency order matters
for p in utils styled motion styles; do
  (cd packages/angulux-$p && corepack pnpm run build)
done

corepack pnpm --filter angulux run build        # → 210 entrypoints
corepack pnpm --filter angulux run test:unit    # → 3765 specs
corepack pnpm --filter @angulux/verify run build
npx playwright test --config e2e/playwright.config.ts   # browser gate → 13/13
```

`pnpm` runs through corepack and is not on `PATH`; use `corepack pnpm`. Karma needs
`CHROME_BIN` set if Chrome is not at the default location.

## Provenance

[`PROVENANCE.md`](PROVENANCE.md) records the exact upstream commits, the archived MIT
artifacts and their checksums, and the command to verify them yourself. You are not asked to
take the MIT claim on trust — you are given the means to check it. That is the whole point
of the project.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. It is short, but the
**provenance clause is not optional**: contributions must not carry code, documentation or
generated output derived from any post-MIT PrimeNG release. One contaminated pull request
would invalidate the entire argument above, so every pull request carries a Developer
Certificate of Origin sign-off and an explicit provenance attestation.

Also relevant: [TRIAGE.md](TRIAGE.md) (what happens after you file) ·
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md) ·
[SUPPORT.md](SUPPORT.md) · [GOVERNANCE.md](GOVERNANCE.md)

### Think the provenance claim is wrong somewhere?

Then that is the single most valuable thing you can report here, and it is handled as P0:
[open a Provenance concern](https://github.com/anguless-com/angulux/issues/new/choose).

A project that asks you not to trust it has to mean it. The claim gets checked, not
defended; if it holds, the affected code is removed rather than argued for; if a gate should
have caught it, a gate gets written; and the outcome is published either way, including when
the report turns out to be wrong. If you are a rights holder making a legal claim, use the
[private channel](https://github.com/anguless-com/angulux/security/advisories/new) instead.

## License

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
