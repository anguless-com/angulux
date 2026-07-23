# Governance

Small project, honest structure. This document says who decides what, so that nobody has to
guess — including future-me.

## Current state: BDFL, and it says so

angulux has **one maintainer**, [@trungnghia112](https://github.com/trungnghia112), who
holds final say on scope, API, releases and merges. This is not an aspirational "core team"
document. Bus factor is 1, it is listed as a risk in the [README](README.md), and pretending
otherwise would mislead people making an adoption decision.

The maintainer's job, in priority order:

1. keep the MIT provenance argument true and machine-verifiable;
2. keep the library green on the current Angular major;
3. everything else.

When (1) and (3) conflict, (1) wins. That is the whole reason the project exists.

## How this changes

The intent is to add maintainers, not to stay a solo project. A contributor is invited to
maintainer after a sustained record of merged work and good judgement in review — there is
no fixed commit count, because the useful signal is "would I trust this person's merge when
I am not looking", and that is a judgement rather than a threshold.

Maintainers get commit access and release rights. If a second maintainer joins, this
document is amended in the same pull request, and disagreements move to the
[Decisions](#decisions) rule below rather than staying with one person.

## Decisions

**Today:** the maintainer decides, in public, with the reasoning written down. Any decision
that would be expensive to reverse gets an issue before it gets a commit.

**With two or more maintainers:** lazy consensus. A proposal open for 72 hours with no
sustained objection is accepted. Sustained objection escalates to explicit agreement between
maintainers; if that fails, the status quo wins — an unresolved disagreement is not a
mandate for change.

Things that always require an issue and a written decision, never a drive-by pull request:

- adding a **runtime dependency** (the dependency surface is a license risk surface here);
- changing the **public API** (see the freeze below);
- changing what the **gates** enforce, or weakening one;
- promoting or removing a module from the warranted set;
- anything touching **licensing, provenance, or trademark** text.

## The API freeze, and its expiry date

The public API is **frozen for the `22.x` line**. Bug fixes, performance work, and attic
promotions are in scope; redesigning existing component APIs is not. Pull requests that
change public API on `22.x` will be asked to wait.

The reason is mechanical, not conservative. The major version is locked to Angular's major
(`angulux@22.x` ↔ Angular 22), so a breaking change can only ship in the next major — which
arrives with **Angular 23, expected around November 2026**. Miss that window and the change
waits roughly six months for Angular 24.

So API redesign is not deferred indefinitely; it is **queued for the Angular 23 release**.
Proposals are welcome now, as issues labelled `api-v23`, so the design work is done before
the window rather than during it.

## Release policy

- `angulux` majors track Angular majors. `angulux@22.x` supports Angular `^22.0.0` and
  nothing else.
- The four forked packages (`angulux-styled`, `angulux-utils`, `angulux-styles`,
  `angulux-motion`) version **independently on `1.x`**. They do not depend on Angular, so
  binding them to Angular's major would state a compatibility constraint that does not
  exist.
- Releases are generated from [Conventional Commits](https://www.conventionalcommits.org/)
  by semantic-release, in two independent trains. Nobody hand-edits a version number.
- Published artifacts carry npm provenance attestations.
- **Security fixes** for a superseded major continue for six months. See
  [SECURITY.md](SECURITY.md).

## Compatibility commitment

A green build within **14 days of every Angular major RC**, verified by a nightly job that
builds against `@angular/core@next` and reports publicly.

This is the one promise the project makes, and it is deliberately the only one, because it
is the only one a single maintainer can keep with a machine's help rather than by being
available. Everything else is best-effort. If the nightly job goes red and stays red, that
is visible to you at the same moment it is visible to the maintainer — which is the point.

## Scope: what will not be accepted

- **Feature parity with current PrimeNG as a goal.** angulux ships 64 warranted modules.
  Full parity is [Optimus UI](https://github.com/openng-org/optimus-ui)'s aim, not this
  project's, and duplicating it would be worse for everyone than pointing at it.
- **Any code derived from a post-MIT PrimeNG release.** See the provenance clause in
  [CONTRIBUTING.md](CONTRIBUTING.md). This one is not negotiable at any level of governance.
- **Weakening a gate to unblock a change.** If a gate is wrong, fix the gate deliberately,
  in its own pull request, with the reasoning recorded. Six separate incidents in this
  repository's history were caused by a class of error a gate now catches.

## Amending this document

Open a pull request. While the project has one maintainer, they decide; with more, the
decision rule above applies. Amendments are recorded in the git history, which is the only
changelog this file needs.
