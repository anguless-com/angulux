---
name: angulux
description: Write or modify Angular code in this repository — angulux components, the showcase app, specs, or library source. Covers what no model has in training data (angulux is a 2026 fork, so recalled PrimeNG markup is wrong) plus the Angular 22 conventions and the repository rules the gates enforce. Use before writing any .ts, .html or .spec.ts here.
---

# angulux

## Look it up; do not recall it

angulux is a 2026 fork of PrimeNG 21.1.9. **No model has seen it.** Asked for a button, the
training-data answer is `<p-button>` from `primeng/button`, and every part of that is wrong
here: the selector, the import specifier, and often the API.

The `angulux` MCP server answers from `corpus/corpus.json`, generated from this library's own
TypeScript and gated against drift by `check:corpus`. Use it:

| Tool | When |
| --- | --- |
| `list_modules` | you need the supported module list or an import specifier |
| `get_module` | before writing markup. `view: 'summary'` first for an unfamiliar module, then the declaration you need — `table` is ~70 KB in full |
| `search_api` | you know an input/output/slot name but not which component declares it |
| `check_usage` | **before recommending any angulux code you did not read out of the corpus** |
| `corpus_info` | an answer looks inconsistent with the code in front of you — compare the hash |

`check_usage` is the one to reach for by reflex. It catches wrong selectors, unscoped import
specifiers, deprecated inputs, and the two failures that produce no error at all.

### The three renames

- Selectors: `p-button` → `agl-button`, `pTooltip` → `aglTooltip`.
- Import specifiers are scoped: `primeng/button` → `@anguless/angulux/button`.
- CSS class names (`p-*`) were **deliberately kept**. Do not "fix" them — see NOTICE.

### Template slots fail silently

There is exactly one route per slot: `<ng-template #NAME>`, read by `contentChild('NAME')`.
`pTemplate=`/`aglTemplate=` is retired; an unmatched one is a plain static attribute, so
Angular reports nothing, the build stays green, and the slot renders empty. Slot names are
case-exact and often all-lowercase (`#loadingicon`, not `#loadingIcon`) and cannot be derived
from the field that reads them. Ask `check_usage` for the slot list; never infer it.

### Not every module exists

Only the warranted closure ships; the rest sit unbuilt in `packages/angulux/attic/`. Confirm
with `list_modules` before promising a component. Do not write module counts into new files —
`check:module-counts` re-derives them, and a hand-typed number is a claim that goes stale.

## Angular 22 conventions

This workspace is Angular `^22`, TypeScript `6.0.x` (the compiler requires `>=6.0 <6.1`),
Node `>=22`, pnpm 9.6.0 via corepack.

- Standalone components. Do **not** write `standalone: true` — it is the default in v20+.
- Do **not** set `changeDetection: ChangeDetectionStrategy.OnPush` — it is the default in
  v22+. Note that v22 renamed `Default` to `Eager`, and the enum makes them equal
  (`{ OnPush: 0, Eager: 1, Default: 1 }`): match the risk class, not the spelling.
- `input()`, `output()`, `model()` functions — not the decorators. `model()` for `[(prop)]`
  rather than an `input()`/`output()` pair.
- `signal()` for state, `computed()` for derived state, `linkedSignal()` when derived state
  must stay synchronized across several reactive sources. Use `set`/`update`, never `mutate`.
- `inject()`, not constructor injection. Prefer the `@Service` decorator over
  `@Injectable({ providedIn: 'root' })` for new singletons.
- Native control flow `@if` / `@for` / `@switch` — not `*ngIf` / `*ngFor` / `*ngSwitch`.
- `class` and `style` bindings — not `ngClass` / `ngStyle`.
- Host bindings go in the `host` object of the decorator. No `@HostBinding` / `@HostListener`.
- Signal Forms (`@angular/forms/signals`) for new forms; reactive forms otherwise; never
  template-driven.
- `NgOptimizedImage` for static images (it does not work for inline base64).
- Strict types. Prefer inference; `unknown` over `any`.
- Accessibility is not optional: AXE-clean, WCAG AA — focus management, contrast, ARIA.
  The browser gate runs axe-core over every showcase page (`e2e/showcase-axe.spec.ts`)
  against `e2e/axe-baseline.json`, which only shrinks: a page may not gain a violation.
  Do not raise a number in that file; a new demo needs labels and names from the start.

## Repository rules

**`ref/` is read-only (constitution P2).** It is the quarantined upstream evidence clone,
reproducible from the SHA in `PROVENANCE.md`, and its whole value is that nothing has been
written into it (`check:license` fails if either clone is modified or off its recorded
commit). Never edit it, and never point a build, dev server or test run at the
`angular.json` files inside it. The project-scoped `angular-cli` MCP server runs
`--read-only` for exactly this reason — `run_target`, `devserver_start` and `devserver_stop`
are gone. Run builds, tests and dev servers from the shell instead.

**English only in tracked files.** `check:language` scans every file git tracks, including
this one, and comments and test fixtures are in scope.

**Do not commit internal paths.** `check:public-tree` refuses `.agl/`, `plans/`,
`docs/specs/`, `ref/`, `provenance/tarballs/`. `.gitignore` does not untrack.

**Dependencies are catalog-pinned.** Versions live in `pnpm-workspace.yaml`, exact for
installed packages (this is the license risk surface) and ranged for `@angular/*` peers.
Prefer a catalog entry to a literal version in a package manifest. `check:catalog` reads
every manifest and fails on anything installed that is not exact, a catalog entry or a
`workspace:` member, and on a ranged `pnpm.overrides` entry; `peerDependencies` stay ranges.

**The conventions above are linted.** `check:lint` runs ESLint. `apps/showcase`,
`apps/verify` and `e2e` are held at zero: a decorator input, output or query, constructor
injection, `@HostBinding`, `*ngIf`, `ngClass`, `ngStyle`, `standalone`, explicit `OnPush`,
`any` or `@ts-ignore` fails, and so does inaccessible markup in the showcase. Library and
forked-package source is held to `tools/lint-baseline.json`: a file may not gain a finding,
and a new file starts at zero. One exception there: an input, output or query added to a
decorator-based library component follows the file it is in, and is not linted. When you
remove a finding, run `node tools/check-lint.mjs --prune` and commit the smaller baseline.
Never raise a number in that file, and never add an `eslint-disable` comment: both are the
maintainers' decision.

**The public API is frozen until the next Angular major.** `check:api-surface` compares the
corpus with the last release and fails on a removed, renamed or retyped selector, input,
output or slot. Do not add an exception to make it pass; that is the maintainers' decision.

## Before you call it done

```bash
npm run check     # every gate, no build needed, ~3s
```

The gates are not style checks; each one closes a class of failure that has already happened
here. If one fails, fix the cause — do not weaken the guard to make it pass.
