# angulux

**A curated Angular 22 UI component library, forked from the last MIT release of PrimeNG (21.1.9), with the MIT provenance proven by machine rather than asserted in prose.**

[![CI](https://github.com/anguless-com/angulux/actions/workflows/ci.yml/badge.svg)](https://github.com/anguless-com/angulux/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@anguless/angulux)](https://www.npmjs.com/package/@anguless/angulux)
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

1. **It ships 65 of PrimeNG's 117 modules.** Editor, Tree, OrganizationChart, PickList,
   OrderList, Listbox and 46 others are not ported — all 52 are listed in
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

Seventeen gates run on every commit and every pull request. They do not check style — each one
closes a class of failure that has already happened in this repository.

| Gate | What it refuses to let through |
|---|---|
| `check:catalog` | a dependency version drifting off the pinned catalog |
| `check:scope` | the transitive closure drifting off the 65 warranted modules |
| `check:license` | any PrimeTek package from a post-MIT release entering the tree — and, separately, any licence-flagged material sitting in `ref/` that `PROVENANCE.md` does not declare |
| `check:names` | PrimeNG names surviving in selector, API or **trademark** positions — including inside bare strings, JSDoc links and DOM attributes |
| `check:risk-coverage` | the browser gate's scope drifting off the risky decorators computed from source |
| `check:language` | non-English text reaching a public repository |
| `check:public-tree` | internal-only paths sitting in the git index (`.gitignore` does **not** untrack) |
| `check:scope-names` | a bare `angulux`/`angulux-*` package reference surviving where the scoped `@anguless/*` name belongs |
| `check:tsup` | the bundler leaking outside the four forks' own build scripts |
| `check:action-inputs` | a workflow passing a `with:` key that its action does not declare — YAML nobody validates until it silently does nothing |
| `check:release-plugins` | a release train listing the same plugin twice, or naming the wrong rail — the first published `22.2.1` with every changelog entry printed twice, and nothing else noticed because the version and the package were both correct |
| `check:facet-single-route` | a template slot growing a second route, after the whole library was collapsed onto one `<ng-template #x>` mechanism |
| `check:corpus` | `corpus/corpus.json` drifting off the source it is generated from — a generated artifact nobody regenerates is a lie with a timestamp, and nothing else breaks when it goes stale |
| `check:demo-code` | the documentation site claiming something the library does not do — a demo whose shown code stopped matching the demo that ran, a page entry pointing at a different file than it names, or a module documented on the public web that no release contains |
| `check:peer-licence` | angulux's own manifest telling a **consumer's** package manager to install a commercially-licensed PrimeTek package — `check:license` proves the tree installed *here* is clean, which is a different question from what the published version ranges admit |
| `check:install-scripts` | a dependency running arbitrary code during `pnpm install` without anyone deciding it should — the release job installs while holding `id-token: write`, so one compromised transitive package could mint an npm credential and publish as this project with a valid attestation |
| `check:gate-count` | this list going stale — the count and the gate names are re-derived from `package.json` and checked against every place they are written down |

```bash
npm run check     # all seventeen, no build needed
```

Two further checks run after the build rather than inside that suite, because neither has
anything to inspect until there is a build to inspect. Both look at the artifact instead of
the source it came from:

| Check | What it refuses to let ship |
|---|---|
| `check:publishable` | packs every package and reads `package.json` back **out of the tarball**, so what gets inspected is the exact bytes npm would receive. It exists because a guard that read the source tree instead once passed while three packages were about to publish an uninstallable `workspace:` dependency |
| `check:dts` | compiles the **emitted `.d.ts`** with `skipLibCheck: false`. Every tsconfig here sets it to `true`, which means our own declarations are the one thing no build in this repository type-checks — a consumer who turns it off compiles them for real, and if they do not stand up alone that consumer's build breaks while ours stays green |

Both refuse to run against nothing, and `check:dts` goes further: it reports success only
after a deliberately broken declaration has been put through the same program and rejected.
A type-check aimed at zero files does not say "I found nothing" — it says "no errors".

Two of them — `check:license` and `check:catalog` — **also run daily on a schedule**, and
that is not redundancy. A pull-request run only proves the tree was clean *at our last
commit*, while the boundary those two enforce lives outside this repository: PrimeTek
decides which of their releases is the last MIT one, and that can change on a day when
nobody here pushes anything. The rest gate our own code, so a commit is the only
moment they can be wrong.

On top of that: `provenance/manifest.json` records SHA-256 checksums and registry publish
timestamps for every archived MIT artifact, and a browser gate renders **16 of 16**
risk-flagged decorators in a real Chromium and asserts on the result — because a green
type-check cannot see a render bug.

It was 15 of 15 until the guard was asked what it actually matched. Angular 22 renamed
`ChangeDetectionStrategy.Default` to `Eager` and deprecated the old spelling; the guard
recomputed its risky set by grepping for the new one, so three CheckAlways components —
`agl-scroller` and two in `table.ts` — were outside the guarded set while the gate
reported full coverage. The enum makes the two spellings literally equal
(`{ OnPush: 0, Eager: 1, Default: 1 }`). A guard that matches a token rather than a risk
class is a guard a rename can switch off.

That gate has a second half, for the bugs a green *spec suite* cannot see. It opens all
51 module pages of the showcase — the markup a reader copies, rather than the reduced
markup a spec sets up — and measures whether what the library draws survives its own
CSS: an element's rectangle intersected with every clipping ancestor. It exists because
a badge shipped that was present, correct and 32% visible.

Evidence measured at `22.2.3`, reproducible from a clean checkout:

<!-- Anchored to a version on purpose. Two of these numbers cannot be gated cheaply: the
     spec count needs a 90-second suite run and the browser gate needs a browser, while
     `npm run check` exists to answer in three seconds. A number that cannot be gated must
     not be written in the present tense, or it becomes a claim that quietly stops being
     true — which is the failure this repository keeps finding in other people's prose.
     `17/17` IS gated, by check:gate-count. -->

```
17/17 gates          exit 0
library build        exit 0 · 211 entrypoints
inherited spec suite 3809 SUCCESS
browser gate         70 tests · 14 behaviour + 56 visibility
runtime deps         tslib + four first-party angulux-* packages. Zero PrimeTek.
```

### 2. Angular-latest-first, as a published commitment

The commitment is **a green build within 14 days of every Angular major RC**, verified by a
nightly job that builds against `@angular/core@next` and reports publicly. angulux's major
version is locked to Angular's major, so `angulux@22.x` targets Angular 22 and nothing else.

### 3. 65 warranted modules instead of 117 unverified ones

Every shipped module is inside the closure that the gates cover. The other 52 live in
[`packages/angulux/attic/`](packages/angulux/attic/) — verbatim upstream source, not built,
not published, kept in the open as a roadmap. Promoting one is a well-defined contribution; see
[CONTRIBUTING.md](CONTRIBUTING.md).

## What angulux is NOT

- **Not a drop-in replacement.** Selectors changed. A migration codemod is planned, not shipped.
- **Not feature-parity with PrimeNG.** 65 of 117 modules. Missing, among others: Editor,
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
npm run check                                   # the 17 gates

# the four forked packages build BEFORE the library — dependency order matters
for p in utils styled motion styles; do
  (cd packages/angulux-$p && corepack pnpm run build)
done

corepack pnpm --filter angulux run build        # → 210 entrypoints
corepack pnpm --filter angulux run test:unit    # the inherited spec suite
corepack pnpm --filter @angulux/verify run build
npx playwright test --config e2e/playwright.config.ts   # browser gate
```

`pnpm` runs through corepack and is not on `PATH`; use `corepack pnpm`. Karma needs
`CHROME_BIN` set if Chrome is not at the default location.

## Documentation

<https://angulux.anguless.com> is the documentation site: a page per module with runnable
demos, and an API reference for all 65 modules generated from `corpus/corpus.json` — the same
corpus that produces the files in the next section, so the two cannot say different things
about the same API.

It is built from `apps/showcase`, which is a workspace app and is never published to npm.
Its demos compile against `packages/angulux/dist`, not against `src`, so every demo on the
site is a demo of the package a user actually installs. The code shown under each demo is
EXTRACTED from the demo that just ran rather than written alongside it, and `check:demo-code`
fails the build if a demo stops being extractable, if a page entry names one demo and loads
another, or if a module is documented that no release contains. See `apps/showcase/README.md`
for the rules a demo file has to follow.

## Documentation for AI assistants

Angulux is new, so no model has seen it. Ask an assistant about it and it will answer with
PrimeNG's `p-*` API, because that is the only thing in its training data. These files exist
so it does not have to guess:

| URL | What it is |
| --- | --- |
| [the index page](https://angulux.anguless.com/llms) | what is here, for a reader who trimmed the URL back to the host. The host root now serves the documentation site for humans, so this page lives at `/llms` |
| [`llms.txt`](https://angulux.anguless.com/llms.txt) | the index, in the [llms.txt](https://llmstxt.org) format |
| [`llms-full.txt`](https://angulux.anguless.com/llms-full.txt) | every module's API in one file |
| `<module>.md` | one page per module, e.g. [`button.md`](https://angulux.anguless.com/button.md) |

All of it is generated from this repository's own TypeScript into `corpus/corpus.json`, and
`check:corpus` fails the build if the committed corpus is not byte-identical to a fresh
generation. Nothing here is hand-written, so **do not edit the corpus or the pages** — the
next generation overwrites them. Fix the JSDoc in the component instead.

Three things worth knowing before you rely on it:

- **`llms-full.txt` is not part of the llms.txt specification.** The spec defines one file,
  `llms.txt`. The full variant is a widely-followed convention, and we serve it because
  assistants look for it — not because a standard requires it.
- **Most inputs do not document a default.** Only 127 of 1205 declare `@defaultValue`, so
  pages say *not documented* rather than leaving a blank that reads as "there is no default".
- **69 inputs are deprecated** and each page names the replacement. That number is the single
  best reason for this to exist: without it, an assistant recommends them confidently.

The generator can only read `packages/angulux/**` and `tools/**` and makes no network
request. That boundary is enforced in code and asserted by a test, because the PrimeNG
*documentation site* was never MIT — only the source was, and only up to 21.1.9.

### For assistants that speak MCP

`packages/angulux-mcp` serves the same corpus as five tools over MCP stdio, so an assistant can
query it instead of reading a page. It is **not published** — run it from a checkout:

```
claude mcp add angulux -- node /absolute/path/to/angulux/packages/angulux-mcp/bin/angulux-mcp.mjs
```

The tool worth knowing about is `check_usage`. Give it a selector, an import specifier, a module
name or a list of inputs, and it answers before you write the code:

```
check_usage({ selector: 'p-button', entrypoint: 'primeng/button' })
  → selector `p-button` is PrimeNG's; angulux uses `agl-button`
  → import specifier `primeng/button` does not resolve; use `@anguless/angulux/button`
```

A test drives the real binary over stdio and proves all 24 benchmark questions are answerable in
at most two tool calls, with PrimeNG's answer absent from the reply. That is a claim about the
data, not about assistants: whether a model actually consults the server instead of guessing is
**not measured** — see the package README.

See [`packages/angulux-mcp/README.md`](packages/angulux-mcp/README.md) for the other four tools,
the non-Claude client snippet, and why the package is unpublished.

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
