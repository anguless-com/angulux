# Contributing to angulux

Thanks for considering it. This document is short, but two sections are hard requirements
rather than etiquette: **Provenance** and **Sign-off**.

## The one rule that matters most: provenance

angulux's entire value proposition is that its MIT provenance can be verified by machine.
A single contribution carrying code from a **post-MIT PrimeNG release** would destroy that,
and no amount of later cleanup fully restores it — the claim becomes "we think we removed
it all", which is exactly the kind of claim this project exists to avoid making.

So, by opening a pull request you attest that your contribution contains no code,
documentation, test fixtures, or generated output derived from:

- **PrimeNG 22 or later**, or any PrimeNG LTS release (these are commercially licensed);
- **`@primeuix/*` or `primeicons` releases past the MIT boundary** recorded in
  [`PROVENANCE.md`](PROVENANCE.md);
- **primeng.dev / primefaces.org website content** — the documentation site is not
  covered by the MIT grant, so its prose and examples cannot be copied even though the
  library code can;
- any other source you are not licensed to contribute under MIT.

### This applies to AI assistants, and that is the likeliest way it gets violated

Coding assistants have post-MIT PrimeNG in their training data and will reproduce it on
request without saying so. If you used an assistant, you are responsible for the output as
if you had typed it. Do not prompt one with "port this from PrimeNG 22" or paste
commercially-licensed source into it. Derive from
[`packages/angulux/attic/`](packages/angulux/attic/) or from upstream 21.1.9, both of which
are MIT and already in this repository.

Two things to know before you assume this is theatre:

- `check:license` runs on every pull request and fails the build if a PrimeTek package from
  a post-MIT release enters the dependency tree.
- `check:names` fails on PrimeNG names in selector, API and trademark positions — including
  inside bare strings, JSDoc links and DOM attributes. Trademark hygiene is a legal
  requirement here, not a naming preference.

Neither tool can read your mind about where a hand-written implementation came from. That
part runs on your attestation, which is why the sign-off below is required.

## Sign-off (DCO)

Every commit must carry a Developer Certificate of Origin sign-off:

```bash
git commit -s -m "feat(button): add loading state"
```

This appends `Signed-off-by: Your Name <your@email>` and means you agree to the
[Developer Certificate of Origin 1.1](https://developercertificate.org/). There is no CLA;
sign-off is the whole ceremony. Missing sign-off fails CI.

## Getting set up

```bash
corepack pnpm install
npm run check     # the 18 gates, no build needed — run this first, it should be green
```

Full build and test loop, in dependency order:

```bash
for p in utils styled motion styles; do
  (cd packages/angulux-$p && corepack pnpm run build)
done

corepack pnpm --filter @anguless/angulux run build        # → 210 entrypoints
corepack pnpm --filter @anguless/angulux run test:unit    # the inherited spec suite
corepack pnpm --filter @angulux/verify run build
npx playwright test --config e2e/playwright.config.ts   # browser gate
```

`pnpm` runs through corepack and is not on `PATH` — use `corepack pnpm`. Karma needs
`CHROME_BIN` if Chrome is not at the default location.

## Your first pull request, concretely

```bash
# 1. Fork on GitHub, then:
git clone git@github.com:<you>/angulux.git
cd angulux
git remote add upstream git@github.com:anguless-com/angulux.git

corepack pnpm install
npm run check          # should be 18/18 green before you change anything.
                       # If it is not, that is a bug — please report it.

# 2. Branch.
git switch -c fix/datepicker-same-day-reselect

# 3. Work. Commit with sign-off and a Conventional Commits message.
git commit -s -m "fix(datepicker): stop the overlay closing on a same-day reselect"

# 4. Before pushing, run what CI will run.
npm run check
corepack pnpm --filter @anguless/angulux run test:unit
# ...and for anything that renders, the browser gate:
npx playwright test --config e2e/playwright.config.ts

git push -u origin fix/datepicker-same-day-reselect
```

Then open the pull request. The template asks for two things people are often surprised by:
the **provenance attestation** (checked by a CI job, not read hopefully — the job skips
bots, which are covered by machine gates instead, and the named maintainers, whose
attestation would be a statement made to themselves; it is mandatory for everyone else)
and **evidence** —
actual command output, not "tests pass".

Two mechanical failures catch most first-timers, and both are quick to fix:

```bash
# "missing Signed-off-by"
git commit --amend -s          # last commit
git rebase --signoff main      # a whole branch

# "PR title is not valid" — the title becomes the commit message on main,
# because this repository squash-merges. Edit the title, don't rewrite commits.
```

[TRIAGE.md](TRIAGE.md) describes what happens after you submit, including how long it
should take and what silence means.

## What to work on

**Promoting a module out of the attic is the most useful contribution**, and the most
well-defined. The 52 unported modules sit verbatim in
[`packages/angulux/attic/`](packages/angulux/attic/) — MIT source, not built, not published.
Every one of them has an issue labelled `attic-promotion`, sized, with the ones that are
genuinely beginner-friendly labelled `good first issue`:

```bash
node tools/community/seed-attic-issues.mjs      # see the list and the sizes locally
```

[`docs/attic-promotion.md`](docs/attic-promotion.md) is the same 52 sorted by what a
promotion actually costs — what each one drags in, whether it arrives with an inherited
spec suite, and the costs that are invisible until you are halfway through. Two of those
are worth knowing before you pick: `editor` reaches its engine through a dynamic
`import()` that no manifest declares, and `image` has one in its spec pointing at an
un-renamed `primeng/*` path — a string, so the rename codemod and the type checker both
walk straight past it.

The ones labelled `good first issue` are small and self-contained. A few are marked as *not* beginner tasks with
the reason stated — `picklist` and `orderlist` need `listbox` first, `editor` wraps a
third-party engine, and several leaned on `@angular/cdk`, which this project deliberately
dropped as a peer. Promoting `listbox` unblocks two others, so it is worth more than its size
suggests.

A promotion is complete when:

1. the module moves from `attic/<name>/` to `src/<name>/`;
2. selectors are renamed to the `agl-*` / `agl*` convention (`p-*` **CSS class names stay**
   — see [NOTICE](NOTICE) for why that distinction exists);
3. `npm run check` is green, including `check:scope` — promoting a module changes the
   warranted closure, so the closure file is regenerated with
   `node tools/scope/gen-closure.mjs` and the diff is part of your pull request;
4. the inherited specs for that module pass;
5. if the module carries a risk-flagged decorator, the browser gate covers it — otherwise
   `check:risk-coverage` fails, and it is right to;
6. every counted claim moves with it. The shipped set goes up by one and the attic goes
   down by one, which reaches further than it looks: the module-count assertions under
   `packages/angulux-mcp/test/` and `tools/corpus/test/`, the `corpusSourceHash` stamp in
   `packages/angulux-mcp/benchmark/questions.json`, `docs/attic-promotion.md` (regenerate
   with `node tools/community/survey-attic.mjs`, never by hand), and the prose counts in
   the README, the issue templates and elsewhere. `npm run test:tools` catches the
   assertions and the stamp; the prose is on you. Two of those numbers are derived rather
   than stated — "and 46 others" in the README, and the count of beginner-sized modules in
   this file — so a search for the old number will not find them.

Bug fixes and Angular-compatibility work are equally welcome. **New API design is currently
out of scope**: the public API is frozen until the next Angular major. See
[GOVERNANCE.md](GOVERNANCE.md).

### Following upstream without reading upstream

PrimeTek keeps shipping, and everything they ship now is commercially licensed. Their
changelog is still readable: a defect report is a fact about how software behaved, and facts
are not licensed. Their code is not readable, and neither is their site's prose.

```bash
npm run watch:upstream            # read the changelog, sorted by what it can mean here
npm run watch:upstream -- --record # accept the entries once they have been triaged
```

The tool reads one page and nothing else — [`tools/upstream/source.mjs`](tools/upstream/source.mjs)
refuses any other URL, and a test proves it refuses before the request. Decisions land in
`tools/upstream/seen.json`, keyed by a digest instead of by their sentence, so none of their
prose is stored here. A weekly job opens a triage issue when entries accumulate.

**A `follow` line is not a patch to port.** It says a defect was reported against a component
angulux also ships, which makes it a place to point our own test. This fork diverged at
`21.1.9`: the defect may not exist here, and where it does, the fix is written from our
source. Reaching for their diff to settle the question is the exact line above.

## Commits and pull requests

Commit messages and PR titles follow
[Conventional Commits](https://www.conventionalcommits.org/) — releases and changelogs are
generated from them, so the format is load-bearing rather than cosmetic.

```
feat(table): add virtual scroll to the frozen column layout
fix(datepicker): stop the overlay closing on a same-day reselect
docs: correct the corepack instruction in the README
chore(deps): bump playwright to 1.61.1
```

Allowed types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`,
`revert`. A `!` after the scope, or a `BREAKING CHANGE:` footer, marks a breaking change —
and see the API freeze above before you write one.

Pull requests should:

- **be one change.** Unrelated cleanup in the same diff means the change cannot be reverted
  cleanly, and something in this repository will eventually need reverting cleanly.
- **state evidence, not intent.** "Tests pass" is not evidence; the test count and the gate
  output are. UI and wire-format changes need the browser gate, because type-checking and
  unit tests structurally cannot see render and serialization bugs.
- **keep everything in English.** `check:language` enforces this — a public repository with
  mixed-language internals is not contributable-to.

## Everything English, always

Code, comments, commit messages, test names, issue and pull request text. Test names in
particular: they show up in public CI logs.

## Language of last resort

If you are unsure whether something is allowed — a source you want to derive from, a
dependency you want to add, a name you want to use — **ask in a discussion before writing
the code**. An answer costs a day. A contaminated pull request costs the project's whole
argument.
