# Releasing

Two independent trains live in this repository. No released version number is chosen by hand —
each is computed from the commits, recorded as a git tag, and never written back to the branch.

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

The workflow re-runs the full evidence ladder before releasing anything — 15 gates,
build, 3765 specs, the browser gate — rather than trusting a status check from an older
commit. Then `check:publishable` packs every package and reads `package.json` back **out of
the tarball**, because publishing cannot be undone.

That last gate exists because of a specific near-miss. `postbuild` resolves the
`workspace:` protocol for the main package, which publishes from `dist/`. The four forked
packages publish from their own directory, and nothing resolved theirs — so
`angulux-styled@1.0.0` would have reached the registry declaring
`"angulux-utils": "workspace:^"`, and every consumer install would have failed with
`EUNSUPPORTEDPROTOCOL`. It was caught by installing the packed tarballs into an empty
project, not by any check that read the source tree.

Hence two rules the workflow now follows:

- **Pack with pnpm, publish with npm.** `pnpm pack` resolves the workspace protocol;
  `npm publish <directory>` does not. npm still performs the publish, because that is what
  carries OIDC and `--provenance`.
- **Publish the tarball, not the directory**, so the artifact that ships is the same one the
  gate inspected rather than a second build of it.

The fork train runs **before** the angulux train: `angulux` depends on all four, so the
dependency has to be on the registry before the dependent is.

## Why a release does not commit anything

A release writes **one git tag per train** and **one GitHub release**. It does not commit, it
does not push a branch, and there is no `CHANGELOG.md` in this repository. The generated notes
live on the GitHub release, which is the same text a committed changelog would have carried.

That is not a stylistic preference. `@semantic-release/git` — which commits the version bump
and the changelog — pushes with `git push --tags <url> HEAD:main`, and `main` is protected:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through a pull request.
remote: - Required status check "CI" is expected.
```

The second condition cannot be satisfied by construction: the release commit carries
`[skip ci]`, so it never gets a CI run to satisfy the required check with. The arrangement had
no working path, and the first non-dry-run release — 2026-08-01, run `30684835229` — died
there. It failed **closed**: `prepare` runs before `publish`, so nothing reached the registry,
no tag moved, and `main` was untouched.

Two things make removing the plugin safe rather than merely convenient:

- **semantic-release's own push is `git push --tags <repositoryUrl>`** — tags only, no branch
  ref (`lib/git.js`, v24.2.9). With the plugin gone, no part of a release addresses `main`.
- **Nothing downstream reads the committed version.** semantic-release derives the next
  version from tags, not from a manifest. Both trains detect "a release happened" by comparing
  the on-disk version before and after, which `@semantic-release/npm` (root `package.json`) and
  `@semantic-release/exec` (the four fork manifests) write during `prepare` — inside the same
  run, with or without a commit.

**Consequence to know:** the versions in the committed manifests are not the released versions
and will drift further with every release. Read the tags, or the registry. The one place that
mattered is handled explicitly — see below.

### The fork version the `angulux` package declares

`packages/angulux/package.json` depends on the four forks through `workspace:^`, and
`postbuild` resolves that by reading each fork's `package.json` off disk. Those files used to
be right because the fork train committed its bump to `main` and the angulux job checked `main`
out. Nothing commits now, so the angulux job stamps them first, from the newest
`angulux-forks-v*` tag, before building.

Without that step `angulux@22.1.0` would declare `^1.0.0` while shipping beside
`angulux-utils@1.1.0` — installable, since `^1.0.0` admits `1.1.0`, but a floor unrelated to
what was built and tested together. The tag is the right source because it is correct in all
three cases: the fork train just ran, it was skipped for lack of changes, or it last ran in an
earlier release.

## Path gating: why a `feat(table)` does not bump the fork family

semantic-release on its own computes a bump from every commit since its own last tag. With
two trains in one repository that means a change to the component library would bump the
forked primeuix packages too, releasing four packages in which nothing changed.

So the workflow computes, per train, whether any file under that train's packages changed
since its last tag. If not, the train is skipped entirely. This is a coarse gate and
deliberately so — it is a rule you can verify by reading four lines of `git diff`, rather
than a plugin whose behaviour you would have to trust.

**That paragraph used to end here, with a consequence that turned out to be worse than it
sounded.** The gate answers one question — does this train RUN — and never filtered commits,
so a train that ran analysed every commit since its own tag. Measured on 2026-08-14 during
the `22.2.0` release: both trains printed `Analysis of 17 commits complete`, the same
seventeen. `feat(mcp)` (a package that is `private: true`) and `feat(site)` (the
documentation site, in no package at all) bumped both trains to a minor **and were published
under Features in both sets of release notes**. Over-releasing a version is cheap; a public
changelog crediting a release with work that is not in it is the thing this project cannot
afford.

So there are now two mechanisms for two questions. The path gate still decides whether a
train runs. `release/rail-filter.mjs` wraps `commit-analyzer` and `release-notes-generator`
and hands each only the commits that touched that train, so the version and the notes are
made of the same subset. Both read their paths from `release/rails.mjs`, which the workflow
reads too — one definition, because two copies is how a gate and a filter come to cover
different things.

### Exercising the filter without a release

The workflow's dry-run cannot reach it: if no train has changes the gate skips both jobs, so
the filter never loads. To run it directly — creates nothing, publishes nothing:

```sh
# The tooling, outside the repository, exactly as install-tooling.sh does it.
mkdir -p /tmp/sr && cd /tmp/sr && printf '{"name":"p","private":true}\n' > package.json
npm i @semantic-release/commit-analyzer@13.0.1 @semantic-release/release-notes-generator@14.1.1 \
      conventional-changelog-conventionalcommits@8.0.0
```

Then, from the repository, import `release/rail-filter.mjs` with `NODE_PATH` pointing at that
`node_modules`, build a context of `{ commits, logger, cwd }` from `git log <tag>..HEAD`, and
call `analyzeCommits` twice — once through the wrapper and once through the raw plugin. Run
on 2026-08-25 against the five commits since `angulux-v22.2.0`: **raw `minor`, wrapped `no
release`**, on both trains.

⚠️ `conventional-changelog-conventionalcommits` is not a dependency of any
`@semantic-release/*` package. It is in `SR_TOOLING` because both configs set
`"preset": "conventionalcommits"`, and leaving it out fails inside `load-parser-config` with
a `MODULE_NOT_FOUND` that names the preset rather than the setting that asked for it.

## npm Trusted Publishing (OIDC)

There is **no `NPM_TOKEN`** in this repository, on purpose. Publishing authenticates through
GitHub's OIDC identity, so there is no long-lived credential to leak, and every artifact
carries a provenance attestation — which, for a project whose entire pitch is verifiable
provenance, is the obvious way to do it.

Requirements the workflow already handles: `id-token: write` on the publishing jobs, npm CLI
`>= 11.5.1` (it upgrades npm, since the one bundled with Node 22 is older), and
`npm publish --provenance`.

### No `registry-url:` on `setup-node`, and a gate that says so

`actions/setup-node` writes an `.npmrc` when given `registry-url`, containing
`//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}`. This workflow has no `NODE_AUTH_TOKEN`
by design, and npm does **not** read an unset variable as "no credential" — it sends the
unexpanded string as the token. The registry rejects it, and the rejection arrives as:

```
npm error 404 Not Found - PUT https://registry.npmjs.org/@anguless%2fangulux-styled
npm error 404 … could not be found or you do not have permission to access it
```

which reads like a missing package rather than a failed login. The release of 2026-08-01
([run 30686755583](https://github.com/anguless-com/angulux/actions/runs/30686755583)) died
there — after semantic-release had already tagged and cut the GitHub release, so the repository
was left claiming a version the registry did not have.

The input is therefore gone from both publishing jobs, and a **`No npm credential is
configured`** step asserts the state OIDC expects before either job publishes. It is a guard
against a re-add, and against the shape of this bug generally: an auth failure that presents
as a 404 is one nobody debugs as an auth failure.

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

## Seeding the tags — done 2026-07-30, and the version it fixed

semantic-release derives the current version from git tags. A fresh repository has none, so it
starts at `1.0.0` — wrong for `angulux`, whose major is locked to Angular's. Worse, `1.0.0` is
not on the registry, so the workflow's duplicate-publish guard has nothing to catch: the first
real run would have published `@anguless/angulux@1.0.0` and broken that lock permanently.

Seeded at `83b6038`, where `v22.0.0-rc.0` points:

```bash
git tag angulux-v22.0.0     83b6038
git tag angulux-forks-v1.0.0 83b6038
git push origin angulux-v22.0.0 angulux-forks-v1.0.0
```

### The tag must be a STABLE version, not the published prerelease

The obvious move — tagging `angulux-v22.0.0-rc.0`, the version actually on the registry —
**does not work**, and the run that proved it is its own controlled comparison: same commit,
same tooling, one dry-run.

| Train | Tag | semantic-release | Version |
|---|---|---|---|
| forks | `angulux-forks-v1.0.0` — stable | `Found 31 commits since last release` | `1.1.0` |
| angulux | `angulux-v22.0.0-rc.0` — prerelease | `There is no previous release` | `1.0.0` |

semantic-release attributes a tag to the **channel of the branch it belongs to**. A version with
a prerelease component belongs to the prerelease channel — the `next` branch — so `main` never
sees it and falls back to a first release. The `angulux-v22.0.0-rc.0` tag is left in place: it is
harmless on `main`, and it is the correct anchor if `next` is ever used.

**Consequence, accepted deliberately:** anchoring at `angulux-v22.0.0` means the next automated
release is `22.1.0`, and a plain `22.0.0` will never exist on the registry. Nothing can make the
next automated release *be* `22.0.0` — there are no breaking commits, so the analyser computes a
minor either way. Publishing `22.0.0` by hand first would have bought the number at the cost of
one more irreversible manual publish, which is the step this automation exists to remove.

Verified by dry-run afterwards: **angulux → `22.1.0`, forks → `1.1.0`**, neither on the registry.
`Found N commits since last release` is the line that proves a tag was recognised;
`There is no previous release` is the line that proves it was not.

## Prereleases

The `next` branch is configured as a prerelease channel producing `-rc.N` versions on both
trains. `main` produces stable releases. An RC on `main` (as `22.0.0-rc.0` is) is a
pre-automation artifact, not a pattern to keep — and, as the seeding section above records, it
also cannot serve as `main`'s baseline.

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

semantic-release and its plugins are not in `devDependencies`. This repository's dependency
tree *is* its license risk surface (see [`../SECURITY.md`](../SECURITY.md)) and its lockfile is
evidence. Release tooling has no business in either.

[`install-tooling.sh`](install-tooling.sh) installs the pinned set into `$RUNNER_TEMP` —
outside the repository entirely — and exports `NODE_PATH` so semantic-release can find it. Since
nothing lands in the working tree, the tooling cannot reach the manifest, the lockfile, or the
commit `@semantic-release/git` makes.

### Why not `npx -p`, which is what this was until 2026-07-30

It did not work, and nothing had run it. semantic-release loads plugins with
`resolve-from(cwd, name)` — out of the *project's* `node_modules` — while `npx -p` leaves them in
its own cache. The first dry-run ever attempted died on the first plugin:

```
Error: Cannot find module '@semantic-release/commit-analyzer'
Require stack: - /home/runner/work/angulux/angulux/noop.js
```

The workflow is `workflow_dispatch` only and every first publish was manual, so the release
automation had never executed past version computation. `npm install` inside the repository is
not the alternative either: this is a pnpm workspace whose manifests use the `catalog:` and
`workspace:` protocols, and npm cannot resolve either of them.

`install-tooling.sh` therefore ends by resolving every plugin the way semantic-release will,
from the repository as cwd, and fails there — with the list of what is unresolvable — rather
than three steps later inside semantic-release's plugin loader.

## If a release goes wrong

- **Published the wrong content.** Do not `npm unpublish` and reuse the version — the
  version is burned. Publish a patch that fixes it, and deprecate the bad one:
  `npm deprecate @anguless/angulux@x.y.z "broken, use x.y.z+1"`. The scope is not optional:
  nothing is published under the bare `angulux` — npm's typosquat filter refused it — so a
  command naming it fails instead of doing anything.
- **semantic-release tagged but publishing failed.** This happened on 2026-08-01 and a plain
  re-run does **not** fix it. semantic-release sees its own tag, finds no commits after it,
  concludes no release is warranted, and the publish step — gated on `released == 'true'` —
  is skipped. The run goes green having published nothing.

  Delete the tag and the GitHub release it created, fix the cause, then run again:

  ```bash
  gh release delete angulux-forks-v1.1.0 --yes
  git push origin :refs/tags/angulux-forks-v1.1.0
  ```

  That is safe only while the version is absent from the registry — check with
  `npm view <name>@<version> version` first. Once a version is published, the tag is the
  record of it and deleting it makes the history lie.

  The publish steps themselves ask `npm view` about the version first and **stop** if it is
  already on the registry — they do not skip past it, because a version that exists after
  semantic-release just minted it means the computed version is wrong or an earlier run
  published without tagging. Investigate the tags rather than re-running again.
- **The wrong version was computed.** Check the seeded tags above; that is almost always
  the cause.
