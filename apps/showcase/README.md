# showcase

The documentation site for humans. Private, never published to npm.

It is the counterpart to the LLM-facing files under `site/` — and it is built from the **same**
`corpus/corpus.json`, so the two cannot tell a reader different things about the same API.

## What is generated and what is written by hand

| Half | Source | Cost |
| --- | --- | --- |
| API reference | `corpus/corpus.json`, sliced by `scripts/build-api.mjs` | none — already gated by `check:corpus` |
| Demos | `src/doc/<module>/*-doc.ts`, written by hand | the real cost of this app |

Every module in the corpus gets a page the moment it is in the corpus. Demos then light up
pages one at a time. A module with no demos says so on its own page rather than looking
finished.

## The rule the demo files must follow

`scripts/build-demos.mjs` publishes each demo file **verbatim** as the "Component" tab, and the
contents of its single `<div class="card">` as the "Template" tab. So:

1. **One `<div class="card">` per demo.** It is the extraction boundary.
2. **Nothing in the file but the demo.** No headings, no prose, no showcase-only imports — the
   section title and description live in `src/doc/registry.ts` instead.

The script fails the build if a demo imports a showcase component or has no card div.

The point of extracting rather than hand-writing the snippet: a demo and a separately written
snippet drift apart silently. Nothing goes red; the site simply starts teaching code that does
not do what the page above it just did. Extraction makes that state impossible to represent.

## Build

```sh
pnpm --filter @angulux/showcase start     # dev server on :4211
pnpm --filter @angulux/showcase build     # generate + ng build
```

Both run `scripts/build-api.mjs` and `scripts/build-demos.mjs` first.

`tsconfig.json` points at `packages/angulux/dist`, **not** at `src` — the same choice
`apps/verify` makes, for the same reason. A site built against the source tree would document
an API nobody can install. Build the library first:

```sh
pnpm build:lib
```

## Attribution

The demos here are derived from the PrimeNG showcase at tag `21.1.9`, which is MIT
(`ref/primeng/LICENSE.md`, section *PrimeNG Community Versions License*; the commercial terms
in that file apply only to releases carrying the `-lts` suffix). The transformation applied is
the same one the library itself went through: `p-*` element selectors to `agl-*`, `p*`
attribute selectors to `agl*`, and `primeng/*` imports to `@anguless/angulux/*`.

The notice this obliges us to keep is in the repository `NOTICE` and `LICENSE`, and is repeated
for readers on the site's home page. Upstream commit SHAs are in `PROVENANCE.md`.

Per constitution **P2**, `ref/` is read-only: demos are copied out and then transformed here,
never edited in place.
