# Support

Read this before opening an issue — it will save you time, and possibly save you from
adopting a library that does not fit your constraints.

## What support actually means here

**MIT, best-effort, no SLA.** One maintainer. No paid tier, no support contract, no
response-time commitment. Issues are read; they are not guaranteed to be answered, and a
correct-but-inconvenient answer ("won't fix, here is why") is a normal outcome.

This is stated plainly rather than buried because the alternative — implying support that
cannot be staffed — is how open-source projects burn both their users and their maintainers.
If your organisation needs a guaranteed response, angulux is not the right dependency, and
[PrimeNG's commercial offering](https://primeng.org/) exists precisely for that.

## Where to go

| You want | Go here |
|---|---|
| "How do I do X?" | [Discussions → Q&A](https://github.com/anguless-com/angulux/discussions) |
| A reproducible bug | [Issues → Bug report](https://github.com/anguless-com/angulux/issues/new/choose) |
| A missing component | Check [`attic/`](packages/angulux/attic/) first, then open a **Module promotion** issue |
| A security vulnerability | **Not an issue** — see [SECURITY.md](SECURITY.md) |
| To report suspected non-MIT code | [Issues → Provenance concern](https://github.com/anguless-com/angulux/issues/new/choose) — treated as P0 |
| A licensing or provenance *question* | [Discussions](https://github.com/anguless-com/angulux/discussions), and read [PROVENANCE.md](PROVENANCE.md) first |
| To propose an API change | Read the API freeze in [GOVERNANCE.md](GOVERNANCE.md) first |
| To know what happens after you file | [TRIAGE.md](TRIAGE.md) — priorities, response targets, closing policy |

Blank issues are disabled on purpose. The forms exist because a bug report without a
version, a reproduction, and a browser is not actionable, and asking for those one at a time
costs everyone a week.

## Before you open an issue

**"Component X is missing."** Very likely it is in
[`packages/angulux/attic/`](packages/angulux/attic/) — 53 of PrimeNG's modules are carried
verbatim there but not built or published. That is documented, not a bug. Open a **Module
promotion** issue, or better, promote it yourself: [CONTRIBUTING.md](CONTRIBUTING.md)
describes exactly what "done" means.

**"`p-button` doesn't work."** Selectors were renamed to `agl-*` / `agl*`. CSS class names
(`p-*`) were kept deliberately — [NOTICE](NOTICE) explains why the two were treated
differently.

**"It doesn't work with Angular 21 / 23."** `angulux@22.x` targets Angular `^22.0.0` only.
The major is locked to Angular's major by design.

**"This works differently from PrimeNG."** Sometimes intentionally. angulux is a divergent
fork, not a compatibility layer. If you need behavioural parity with current PrimeNG, use
PrimeNG.

## Answering your own question fastest

```bash
npm run check     # 11 gates, ~3 seconds — is the repository itself sane?
```

Most "is this a licensing problem?" and "did a dependency drift?" questions are answered by
that command faster than by an issue. [PROVENANCE.md](PROVENANCE.md) answers "where did this
code come from and how do I verify that myself".

## Helping

The fastest way to improve support here is to reduce how much of it one person has to give:
answer a question in Discussions, promote an attic module, or turn a vague issue into a
reproduction. Bus factor is 1 and stated as a risk in the [README](README.md#read-this-part-first);
contributions that change that are the most valuable thing this project can receive.
