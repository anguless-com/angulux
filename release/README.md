# Releasing

Two independent trains live in this repository. Nobody edits a version number by hand.

| Train | Packages | Line | Git tag | Config |
|---|---|---|---|---|
| **angulux** | `angulux` | `22.x` — major locked to Angular's major | `angulux-v*` | [`angulux.releaserc.json`](angulux.releaserc.json) |
| **forks** | `angulux-styled`, `angulux-utils`, `angulux-styles`, `angulux-motion` | `1.x` — independent | `angulux-forks-v*` | [`forks.releaserc.json`](forks.releaserc.json) |

The fork family versions independently because it does not depend on Angular. Locking those
four to Angular's major would state a compatibility constraint that does not exist, and
would force four meaningless majors a year.

## Running a release

`Actions → Release → Run workflow`. It is `workflow_dispatch` only — releases are a
decision, not a side effect of merging.

Inputs:

- **dry-run** — defaults to **true**. Computes the next version and the notes, publishes
  nothing. Do this first, every time.
- **train** — `both` (default), `angulux`, or `forks`.

The workflow re-runs the full evidence ladder before releasing anything — seven gates,
build, 3765 specs, the browser gate — rather than trusting a status check from an older
commit. Then it checks the built artifacts for unresolved `catalog:` / `workspace:`
specifiers, because publishing cannot be undone and `postbuild` catching it later is too
late.

The fork train runs **before** the angulux train: `angulux` depends on all four, so the
dependency has to be on the registry before the dependent is.

## Path gating: why a `feat(table)` does not bump the fork family

semantic-release on its own computes a bump from every commit since its own last tag. With
two trains in one repository that means a change to the component library would bump the
forked primeuix packages too, releasing four packages in which nothing changed.

So the workflow computes, per train, whether any file under that train's packages changed
since its last tag. If not, the train is skipped entirely. This is a coarse gate and
deliberately so — it is a rule you can verify by reading four lines of `git diff`, rather
than a plugin whose behaviour you would have to trust.

**Consequence to know:** within a train, the bump is computed from *all* commits since that
train's tag, not only the ones touching its paths. A release can therefore be larger than
strictly necessary (a `feat` elsewhere in a window where a fork file also changed makes the
fork release a minor). Over-releasing a version is cheap; under-releasing, or releasing the
wrong content, is not.

## npm Trusted Publishing (OIDC)

There is **no `NPM_TOKEN`** in this repository, on purpose. Publishing authenticates through
GitHub's OIDC identity, so there is no long-lived credential to leak, and every artifact
carries a provenance attestation — which, for a project whose entire pitch is verifiable
provenance, is the obvious way to do it.

Requirements the workflow already handles: `id-token: write` on the publishing jobs, npm CLI
`>= 11.5.1` (it upgrades npm, since the one bundled with Node 22 is older), and
`npm publish --provenance`.

### ⚠️ The first publish of each package cannot use OIDC

A trusted publisher is configured **on an existing package** on npmjs.com. A package that
has never been published has no settings page to configure, so the first version of each of
the five packages must be published another way.

That is [BL-11](../PROVENANCE.md) territory and it is deliberately not automated here — the
first publish is the single most irreversible step in this project. A version, once used, is
burned even after `npm unpublish`.

One-time sequence:

1. Publish `1.0.0` of the four forked packages and the first `angulux` version **manually**,
   from a clean checkout, with a granular access token, after a Verdaccio dry run.
2. On npmjs.com, for **each of the five packages**:
   `Settings → Trusted publisher → GitHub Actions`, with
   - organization/user: `anguless-com`
   - repository: `angulux`
   - workflow: `release.yml`
   - environment: *(leave empty)*
3. Delete the token used in step 1.
4. Every subsequent release runs through this workflow with no credential at all.

## Seeding the tags before the first automated release

semantic-release derives the current version from git tags. A fresh repository has none, so
it would start `angulux` at `1.0.0` — wrong, since the major is locked to Angular's.

After the manual first publish, create the two tags so both trains know where they are:

```bash
git tag angulux-v22.0.0-rc.0
git tag angulux-forks-v1.0.0
git push origin angulux-v22.0.0-rc.0 angulux-forks-v1.0.0
```

Do this **once**, and check it before the first non-dry-run release. A dry run reports the
version it would produce; if that number looks wrong, the tags are the reason.

## Prereleases

The `next` branch is configured as a prerelease channel producing `-rc.N` versions on both
trains. `main` produces stable releases. An RC on `main` (as `22.0.0-rc.0` currently is) is
a pre-automation artifact, not a pattern to keep.

## What produces which bump

Conventional Commits, `conventionalcommits` preset, with these overrides in both configs:

| Commit | Bump |
|---|---|
| `fix:` | patch |
| `feat:` | minor |
| `perf:`, `refactor:`, `build:`, `revert:` | patch |
| `docs:`, `test:`, `ci:`, `chore:` | **no release** |
| `feat(x)!:` or a `BREAKING CHANGE:` footer | major |

Before writing a breaking change, read the API freeze in [`../GOVERNANCE.md`](../GOVERNANCE.md).
`22.x` is frozen; a breaking change can only ship with the next Angular major, expected
around **November 2026**.

## Tooling is not a dependency

semantic-release and its plugins run through `npx` in the workflow instead of sitting in
`devDependencies`. This repository's dependency tree *is* its license risk surface
(see [`../SECURITY.md`](../SECURITY.md)) and its lockfile is evidence. Release tooling has
no business in either.

## If a release goes wrong

- **Published the wrong content.** Do not `npm unpublish` and reuse the version — the
  version is burned. Publish a patch that fixes it, and deprecate the bad one:
  `npm deprecate angulux@x.y.z "broken, use x.y.z+1"`.
- **semantic-release tagged but publishing failed.** Re-run the workflow. Both publish steps
  check `npm view` first and skip versions already on the registry, so a re-run is safe.
- **The wrong version was computed.** Check the seeded tags above; that is almost always
  the cause.
