# angulux-utils

Framework-agnostic DOM, object and type utilities used by angulux.

Part of [angulux](https://github.com/anguless-com/angulux). Published so the library has
no runtime dependency on packages whose upstream has moved to a commercial license.

## Provenance

Forked from `@primeuix/utils`, MIT, at the final public commit of
[primefaces/primeuix](https://github.com/primefaces/primeuix) (`b9467bc`, repository
archived 2026-06-28\), which published as `@primeuix/utils 0.7.2`.

This package is versioned **independently of angulux**. angulux locks its major to Angular's,
but nothing here depends on Angular — there are no Angular imports and no Angular peer
dependency — so tying these versions to an Angular release would claim a relationship that
does not exist. The lineage lives in this file and in `PROVENANCE.md`, not in the version
number.

The public API is verified to cover that release completely; see `PROVENANCE.md` in the
repository root for the checksummed record and the command to verify it yourself.

## License

MIT. See `LICENSE` and the repository's `NOTICE`. angulux is not affiliated with,
endorsed by, or sponsored by PrimeTek.
