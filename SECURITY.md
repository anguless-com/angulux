# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `angulux` 22.x | ✅ current — fixes land here |
| `angulux-{styled,utils,styles,motion}` 1.x | ✅ current |
| anything older | ❌ there is nothing older yet |

angulux's major version is locked to Angular's major. When Angular 23 ships and
`angulux@23` follows, `22.x` receives security fixes for **six months** and nothing else.
There is no long-term-support line, and there will not be one while the project has a single
maintainer — promising an LTS that cannot be staffed is worse than not promising it.

## Reporting a vulnerability

**Report privately. Do not open a public issue.**

Use GitHub Private Vulnerability Reporting:
**https://github.com/anguless-com/angulux/security/advisories/new**

This is the only private channel; the project deliberately does not publish a personal email
address. If GitHub is unavailable to you, open a public issue containing **no technical
detail** — just a request for a private channel — and you will be contacted.

Please include, as far as you can:

- affected package and version (`angulux@22.0.0-rc.0`, etc.)
- the component or entrypoint involved
- a reproduction — a minimal StackBlitz or a failing spec is ideal
- the impact you believe it has, and any working exploit you have

### What to expect

| Stage | Target |
|---|---|
| Acknowledgement | 5 working days |
| Initial assessment | 10 working days |
| Fix for a confirmed high-severity issue | 30 days, best effort |
| Coordinated disclosure | after the fix is published, credit given unless you decline |

These are **targets, not an SLA**. One maintainer, MIT license, no warranty — see
[LICENSE](LICENSE). If a deadline matters to you commercially, that constraint should be
part of your decision to adopt this library, and it is stated here so it can be.

## In scope

- Vulnerabilities in published `angulux*` package code: XSS through component inputs or
  templates, prototype pollution in the utilities, sanitizer bypasses, DOM injection through
  passthrough or template APIs.
- Supply-chain integrity issues: a compromised release artifact, a broken provenance
  attestation, a mismatch between a published tarball and this repository.
- Build and release pipeline weaknesses that could let an attacker publish as this project.

## Out of scope

- Vulnerabilities in **Angular itself** — report those to
  https://github.com/angular/angular/security.
- Vulnerabilities in **upstream PrimeNG or PrimeTek products**. If a flaw exists in code
  inherited from PrimeNG 21.1.9 and also affects current PrimeNG, please tell us **and**
  PrimeTek; we will not disclose in a way that leaves their users exposed.
- Anything in [`packages/angulux/attic/`](packages/angulux/attic/). Attic modules are
  verbatim upstream source that is **not built and not published** — they cannot reach a
  user through this project. A report there is a roadmap note, not a vulnerability.
- Findings from an automated scanner with no demonstrated impact.
- Missing hardening headers, or anything about a website — this repository ships a library.
- **Advisories against transitive build-tooling dependencies** that cannot reach a consumer
  of the published packages. See the next section — this is the one that will look alarming
  on the Security tab, so it is explained rather than left to be guessed at.

## About the open Dependabot alerts

If you look at the Security tab, you will see open alerts. Here is what they are, before
anyone has to ask.

**They are all in the Angular build toolchain, and none of them ship.** At the time of
writing: four against `webpack-dev-server`, one each against `esbuild`, `@hono/node-server`
and `uuid` — all reached only through `@angular-devkit/build-angular`, `@angular/build` and
`@angular/cli`, all of which are **devDependencies of this repository**. Check it yourself:

```bash
corepack pnpm why webpack-dev-server   # devDependencies: @angular-devkit/build-angular
corepack pnpm why esbuild uuid         # same
```

**What the published packages actually depend on**, which is the number that matters:

| Package | Runtime dependencies |
|---|---|
| `angulux` | `angulux-styled`, `angulux-utils`, `angulux-styles`, `angulux-motion`, `tslib` |
| `angulux-styled` | `angulux-utils` |
| `angulux-styles` | `angulux-styled` |
| `angulux-motion` | `angulux-utils` |
| `angulux-utils` | *(none)* |

That is the entire tree. Outside the first-party packages, the only third-party runtime
dependency anywhere in it is `tslib`. Angular, RxJS and `chart.js` are peers — supplied by
your application, never installed by us. So a vulnerability in a bundler or a dev server is
a risk to *contributors' machines*, not to anything you install.

**Why they are not simply fixed.** Some have no patched version published yet — Dependabot
tries, fails, and reports that it could not perform the update. They are not being ignored;
there is nothing to upgrade to. When a fix ships, Dependabot proposes it on its weekly run
and the change is a normal dependency bump.

**When one of these WOULD be in scope**, and please do report it then:

- if you can show a path by which it reaches a consumer of a published package — that
  contradicts the table above, which makes it a serious finding;
- if it affects the **release pipeline** rather than local development, since that is the
  path from a commit to a published artifact (see the supply-chain items in *In scope*);
- if a patched version exists and has not been taken up after a reasonable interval. That
  is a maintenance failure, and saying so is fair.

The point of writing this down is that "we looked and it does not affect users" should be
checkable rather than asserted — which is the same standard this project applies to its
licensing claims.

## Dependency and license integrity

This project treats the MIT boundary as a security property, because a licensing
contamination has the same shape as a supply-chain compromise: something entered the tree
that should not have.

- `check:license` refuses any PrimeTek package from a post-MIT release, on every pull
  request and on a scheduled run — the scheduled run exists to catch a boundary that moves
  after our last commit.
- Dependabot is configured to **never** propose upgrades to `@primeuix/*` or `primeicons`;
  an automated bump across that boundary would be a license incident opened by a bot.
- `provenance/manifest.json` records SHA-256 checksums and registry publish timestamps for
  every archived MIT artifact. If a published artifact ever fails to match it, that is a
  reportable supply-chain issue under this policy.

If you find a way to defeat one of those gates while leaving CI green, **that is a valid
report and a serious one** — the gates are the product.
