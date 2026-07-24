# Triage

What happens to your issue or pull request after you press submit, written down so you do
not have to guess — and so the maintainer can be held to it.

This is a one-maintainer project. The honest version of a triage process here is not "we
have a rota"; it is "here is the order things get looked at, and here is what silence
means".

## Priority order

Work is picked in this order, and it does not bend for how loudly something is asked for:

1. **Provenance and licensing reports** (`licensing`). The project's whole claim is that its
   MIT provenance can be verified. A credible report that the claim is wrong outranks every
   feature, every bug, and every release.
2. **Security vulnerabilities.** Reported privately — see [SECURITY.md](SECURITY.md).
3. **A red gate on `main`.** A broken gate means the guarantees are unverified right now.
4. **Regressions against PrimeNG 21.1.9.** Something this fork broke that used to work.
5. **Bugs with a reproduction.**
6. **Attic promotions with a pull request attached.**
7. **Everything else**, including bugs without a reproduction.

## Response targets

Targets, not an SLA. MIT, no warranty, one person. See [SUPPORT.md](SUPPORT.md).

| | Target |
|---|---|
| Provenance report acknowledged | 5 working days |
| Security report acknowledged | 5 working days |
| Any other issue triaged (labelled, or closed with a reason) | 14 days |
| Pull request first review | 14 days |
| Provenance report resolved or publicly updated | 30 days |

**What silence means:** nothing good, but nothing personal. If an issue has had no reply
past the target, a single "still relevant?" comment is welcome and is not nagging. If a
pull request has gone quiet, the same. There is no queue you are jumping.

## Labels, and what they actually mean

| Label | Meaning |
|---|---|
| `needs triage` | Not looked at yet. Applied automatically. |
| `licensing` | Touches provenance, the MIT boundary, or trademark. Always P0. |
| `P0` | Being worked on now, ahead of everything else. |
| `angular-compat` | The nightly build against a future Angular is failing. |
| `attic-promotion` | Bringing one of the 53 unbuilt modules into the shipped set. |
| `good first issue` | Well-defined, no hidden context needed. |
| `api-v23` | A breaking API proposal, parked until the Angular 23 window. |
| `gates` | Touches `tools/` — the checks the project's guarantees rest on. |
| `browser-gate` | Touches the Playwright harness or the verification app. |
| `needs reproduction` | Cannot act until it can be reproduced. |
| `upstream` | The cause is in Angular, PrimeNG, or another dependency. |
| `wontfix` | Understood, decided against. The reason is always written down. |

## How an issue gets closed

An issue is closed for one of these reasons, and the reason is always stated:

- **Fixed** — with the commit linked.
- **Not reproducible** — after a request for a reproduction went unanswered for 30 days.
  Closing is not a verdict; comment and it reopens.
- **Working as intended** — with a pointer to where that intent is documented. Most often:
  a missing component that is in `attic/`, or a renamed selector.
- **Out of scope** — see [GOVERNANCE.md](GOVERNANCE.md). Feature parity with current
  PrimeNG, anything derived from a post-MIT release, and weakening a gate are the standing
  ones.
- **Duplicate** — with the original linked.

Issues are **not** closed by a stale bot. An old issue that is still true is still true, and
auto-closing it would only make the backlog look better than it is.

## How a pull request gets merged

1. **CI green.** The aggregate `CI` check covers the 10 gates, DCO sign-off, the build,
   3765 specs, and the browser gate.
2. **Provenance attestation complete** — checked mechanically, not read hopefully.
3. **Review.** Expect questions about evidence rather than about style. The usual reasons a
   pull request stalls: no reproduction of the bug it claims to fix, no browser-gate run on
   a rendering change, or unrelated cleanup in the same diff.
4. **Squash-merged**, with the pull request title as the commit message. Which is why the
   title is linted: releases are generated from it.

Nothing merges without CI, including the maintainer's own work.

## If you disagree with a decision

Say so in the thread. Being outvoted by one person is not a satisfying process, and the
counterweight is that the reasoning has to be written down where you can attack it — see
[GOVERNANCE.md](GOVERNANCE.md). If the reasoning is wrong, saying which part is wrong
usually works. "This is a bad decision" usually does not.

For conduct rather than technical disagreement: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
