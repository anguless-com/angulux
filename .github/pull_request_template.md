<!--
Thanks for contributing. The provenance section below is a hard requirement, not a
formality — see CONTRIBUTING.md for why a single contaminated pull request would
invalidate this project's entire argument.
-->

## What this changes

<!-- One change per pull request. If you are describing two things, it is two pull requests. -->

Closes #

## Why

<!-- What breaks, or what is impossible, without this? -->

---

## Provenance attestation (required)

By submitting this pull request I confirm that:

- [ ] This contribution contains **no code, documentation, test fixtures or generated
      output derived from PrimeNG 22 or later**, from any PrimeNG LTS release, or from
      `@primeuix/*` / `primeicons` releases past the MIT boundary recorded in
      `PROVENANCE.md`.
- [ ] It contains **no content copied from primeng.dev or primefaces.org**. The
      documentation site is not covered by the MIT grant, even though the library code is.
- [ ] If I used an **AI coding assistant**, I reviewed its output for the above and I take
      responsibility for it as if I had written it by hand. (Assistants have post-MIT
      PrimeNG in their training data and will reproduce it without saying so — this is the
      likeliest way the rule gets broken.)
- [ ] My commits are **signed off** (`git commit -s`), certifying the
      [DCO 1.1](https://developercertificate.org/).

## Evidence

<!--
"Tests pass" is not evidence. Counts and gate output are. Paste real output.
UI and wire-format changes need the browser gate — type-checking and unit tests
structurally cannot see render and serialization bugs.
-->

- [ ] `npm run check` — 11/11 gates green
- [ ] `corepack pnpm --filter angulux run test:unit` — spec suite green
- [ ] `npx playwright test --config e2e/playwright.config.ts` — browser gate green
      *(required for any change to rendering, DOM output, or public wire format)*
- [ ] Not applicable — this change touches no code (docs only)

```
paste the relevant output here
```

## Checklist

- [ ] The pull request title follows [Conventional Commits](https://www.conventionalcommits.org/)
      (`feat(table): …`, `fix(datepicker): …`) — releases are generated from it.
- [ ] Everything is in **English**, including test names (they appear in public CI logs).
- [ ] No unrelated cleanup in this diff — it must revert cleanly on its own.
- [ ] If this **promotes a module out of `attic/`**: selectors renamed to `agl-*` / `agl*`
      (CSS `p-*` class names stay), and the regenerated `tools/scope/closure.json` is
      included in this diff.
- [ ] If this changes **public API**: I have read the API freeze in `GOVERNANCE.md`.
      `22.x` is frozen; API redesign is queued for the Angular 23 release.
- [ ] If this adds a **runtime dependency**: there is an issue with a written decision.
      The dependency surface is this project's license risk surface.
