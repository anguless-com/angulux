# attic — unported modules

**Not built. Not published. Not supported. PRs against this directory are not accepted.**

This directory holds the 53 PrimeNG 21.1.9 modules that angulux has **not** ported. They
are kept **verbatim**, exactly as they came from upstream — original selectors (`p-*`),
original `primeng/*` import paths, original JSDoc. Nothing here compiles against the
current `src/`, and nothing here ships in the npm package.

## Why keep them at all

Three reasons, in order of weight:

1. **Provenance.** Modifying these files would destroy the thing that makes them worth
   keeping: they are a byte-level record of what the MIT release actually contained. See
   `PROVENANCE.md`.
2. **Roadmap.** This is the public backlog of what angulux could grow into. Issues
   labelled `good first issue: promote <module> from attic` come from here.
3. **Honesty.** angulux ships 64 of PrimeNG's 117 modules. Hiding the other 53 would
   misrepresent the project's scope.

## Why they are not in `src/`

angulux warrants what it ships. A module leaves `attic/` and enters `src/` only when it
clears the same bar as everything else:

- builds on Angular 22 with `strictTemplates`
- carries its inherited spec suite, green
- its selectors are renamed `p-*` → `agl-*`, `pFoo` → `aglFoo`
- it introduces no PrimeTek trademark into the public API
- if it declares a risk decorator, it is covered by the browser gate

Until a module clears all five, "we have it" would be a claim angulux cannot back.

## Guard coverage

`tools/codemod/scan-prime-names.mjs` scans this directory and prints an inventory of what
it finds, but does **not** fail the build on it — the upstream names here are the point,
not a defect. What the guard *does* enforce is that nothing in `src/` ever imports from
`attic/`, so this code cannot leak into a published build.

## Promoting a module

Open an issue first so the work is not duplicated. Then port it in a single PR: move the
directory into `src/`, run the rename codemod, add the entrypoint, and make
`pnpm run check`, the spec suite, and the browser gate green. A promotion PR that leaves
any gate red will not be merged, no matter how complete the component looks.
