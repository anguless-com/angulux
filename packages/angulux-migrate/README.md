# angulux-migrate

Shows what migrating a PrimeNG project to [angulux](https://github.com/anguless-com/angulux)
would change — imports, template selectors, the dependency — file by file, line by line.

```bash
npx angulux-migrate            # report only — writes nothing
npx angulux-migrate --write    # apply it
```

Run without flags and it writes nothing at all: you get a list of every change it would
make, with file and line, and your project is byte-for-byte as you left it.

## Applying it

`--write` requires a **clean git working tree**, and refuses outside a repository.

That is not caution for its own sake. The only guarantee a codemod can honestly make is that
you can throw its work away, and that requires something to revert to. So there is no
`--force`: an escape hatch on a safety property is the safety property being optional.

When it finishes:

```
✓ Applied 16 edit(s) across 3 file(s).
Revert it all with: git checkout -- .
```

## What actually changes in a migration

Less than people expect, and that is the point:

- **Import paths** — `primeng/button` → `@anguless/angulux/button`
- **Template selectors** — `<p-button>` → `<agl-button>`, `pTooltip` → `aglTooltip`
- **The dependency** — `primeng` → `@anguless/angulux`

## What does NOT change

- **Your `.p-*` CSS class names.** The fork keeps every one of them, so your themes, your
  overrides and your custom styling keep working. This tool never reads a stylesheet, and
  never reports one.
- **Your TypeScript symbols.** `Button`, `ButtonModule`, `MenuItem` and the rest keep their
  names, and every `@Input` and `@Output` keeps its name and meaning. The fork's own rules
  forbid redesigning the public API, so your component code is untouched — only the paths it
  imports from and the tags in your templates move.

## How the matching works, and why it matters

The rewrite is an **allowlist of known selectors, matched by position** — not a
`p-` → `agl-` find and replace.

Both halves are load-bearing. Position means `.p-button` in a stylesheet is never mistaken
for `<p-button>` in a template. The allowlist means your own `<p-widget>` component, which
PrimeNG never had, is left alone. A pattern-based rename would get both of those wrong, and
the damage would be silent: the project would still build, and the styling would just be
gone.

## Reading the report

```
  element selector — 8
    src/app/demo.component.html:1  p-table → agl-table
```

Every line is one edit at one place. An open tag and its closing tag count separately,
because they are two edits.

## Scope

Written for projects on **PrimeNG 21.1.9**, the version angulux forked. On an older major, or
on a commercially licensed 22.x, the report may be incomplete — and it does not claim
otherwise.

Angular only. For PrimeVue and PrimeReact, this tool has nothing to say.

## Licence

MIT.
