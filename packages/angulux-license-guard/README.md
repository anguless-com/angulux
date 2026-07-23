# angulux-license-guard

Fails your build when a **commercially licensed PrimeTek package** reaches your dependency
tree.

PrimeTek moved PrimeNG, PrimeVue and PrimeReact to the commercial PrimeUI licence starting at
specific majors. If your project depends on any of them through a caret range, you are one
`npm update` away from shipping a build you believe is MIT and is not. Nothing in a normal
toolchain says a word about it.

This does. It reads your lockfile — the artifact that records what you actually installed —
and exits non-zero when something across the boundary is in there.

```bash
npm install --save-dev angulux-license-guard
npx angulux-license-guard
```

Wire it into `prebuild` so it runs before anything ships:

```json
{
  "scripts": {
    "prebuild": "angulux-license-guard"
  }
}
```

## Exit codes

These are a contract. Other people's CI branches on them.

| Code | Meaning |
| --- | --- |
| `0` | Verified clean — no PrimeTek package across the boundary |
| `1` | A violation, or a package whose licence could not be verified |

## It fails closed

A PrimeTek package this tool does not recognise is reported as a **failure**, not waved
through. The same applies to a dependency whose version cannot be read as semver — a tarball
URL, a git ref, a `file:` path. Being unable to check something is not the same as it being
safe; it is, in fact, the easiest way to move a commercial build past a guard that only knows
how to compare numbers.

The consequence is deliberate: when PrimeTek publishes a package this tool has never seen,
your build goes red and a human looks at it. A tool that guesses "probably fine" about a
licensing question is worse than no tool, because it produces confidence instead of an answer.

## When you have checked something yourself

If you have verified a package's licence — or you hold a PrimeUI licence and the dependency is
legitimate — acknowledge it explicitly, by name **and exact version**:

```json
{
  "acknowledged": [
    { "name": "@primeuix/themes", "version": "3.0.1", "reason": "covered by our PrimeUI licence" }
  ]
}
```

There is no wildcard and no global off switch. An entry without a version is rejected. An
acknowledgement is a statement about one artifact you looked at, and it stops being true when
the version changes — so the version is required, and a bump makes the build red again on
purpose.

## About the boundary table

The version boundaries ship with this package and are auditable offline — no network call is
made. Every run prints the date the table was last verified.

**The table is a dated observation, not a promise.** No release cadence is committed to. The
authoritative source is PrimeTek's own licensing announcement; check it when the stakes are
high. What this tool guarantees is narrower and more useful: it never reports "clean" about
something it could not actually verify.

Found a boundary that is wrong or missing? Open an issue — that is the mechanism, and it is
the only one being claimed.

## What this is not

Legal advice. This reports which versions are present in your lockfile against a recorded,
dated table. Your licensing position is between you and PrimeTek.

## Licence

MIT. Built for [angulux](https://github.com/anguless-com/angulux), an MIT fork of PrimeNG —
but this package has nothing to do with angulux at run time and does not depend on it.
