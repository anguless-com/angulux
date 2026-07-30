# angulux-mcp

An [MCP](https://modelcontextprotocol.io) server that answers questions about
[angulux](https://github.com/anguless-com/angulux) from the generated API corpus.

Angulux is a 2026 fork, so no model has seen it. Ask an assistant to render a button and it
will reach for PrimeNG's `<p-button>`, because that is the only thing in its training data.
This server lets the assistant look the answer up instead of guessing.

Everything it returns comes from `corpus/corpus.json`, which is generated from the library's
own TypeScript and gated against drift by `check:corpus`. The server reads that file and
nothing else.

## Status: not published, by decision

This package is `private: true` and is **not on npm**.

The decision (owner, 2026-07-29) was to build it now and decide publishing later. Angulux's
API is scheduled for redesign in the Angular 23 window, and an npm version number cannot be
un-burned — so the server runs from a checkout until that lands.

**Re-report trigger:** revisit publishing at the Angular 23 RC window (~Oct–Nov 2026), or
sooner if someone outside the project asks for it.

`private: true` makes `npm publish` refuse outright, and a test fails if that flag is flipped
or if the publish gate ever starts packing this package. The decision is a code path, not a
note in a file.

## Running it

```
node packages/angulux-mcp/bin/angulux-mcp.mjs
```

It speaks MCP over stdio, and makes no network request — asserted by a test that replaces
`fetch`, `http`, `https`, `net`, `tls` and `dns` with stubs that throw, then runs the full tool
round-trip against that process.

### Claude Code

```
claude mcp add angulux -- node /absolute/path/to/angulux/packages/angulux-mcp/bin/angulux-mcp.mjs
```

Add `--scope project` to write a shared `.mcp.json` instead of a private local entry.

### Any other MCP client

The standard stdio form works everywhere — Cursor, VS Code, Codex and Windsurf all read some
variant of this shape:

```json
{
    "mcpServers": {
        "angulux": {
            "command": "node",
            "args": ["/absolute/path/to/angulux/packages/angulux-mcp/bin/angulux-mcp.mjs"]
        }
    }
}
```

Claude Code is the client this was developed and dogfooded against. The snippet above is known
to be the right shape but is **untested** in the other clients — stated plainly rather than
implied.

## The five tools

Named from the corpus's own nouns — it contains **modules** and **declarations**, so the tools
are about modules and declarations. There are no "guides" or "examples" to expose, and
inventing tools for data that does not exist would produce confident empty answers.

| Tool | Use it when |
| --- | --- |
| `list_modules` | you need the supported module list, or just an import specifier — all 64 for a fraction of what one large module costs |
| `get_module` | you are about to write markup. Pass `summary: true` first for an unfamiliar module, then `declaration` for the one you need |
| `search_api` | you know the input or output name but not which component declares it |
| `check_usage` | **before recommending angulux code you did not read out of the corpus** |
| `corpus_info` | an answer looks inconsistent with the code in front of you — compare the hash |

### `check_usage` is the one that earns its place

It catches, in one call, the things a model gets wrong about a fork:

```
check_usage({ selector: 'p-button', entrypoint: 'primeng/button' })

  selector `p-button` is PrimeNG's; angulux uses `agl-button`
  import specifier `primeng/button` does not resolve; angulux is scoped —
    use `@anguless/angulux/button`
```

```
check_usage({ module: 'button', inputs: ['label', 'icon'] })

  input `label` on `ButtonDirective` is deprecated: use aglButtonLabel directive instead.
    (`button` declares `label` on ButtonDirective and Button — only this one is deprecated)
```

That last case is why the corpus is keyed by declaration rather than by module: the same input
name can exist twice with different deprecation status, and collapsing them would let whichever
came last silently decide the answer.

### `get_module` views

`table` declares 25 things, one of which carries 83 inputs. Fetching all of it costs ~70 KB in
a single tool result, so the response says which view it is:

| `view` | |
| --- | --- |
| `full` | everything (default) |
| `summary` | declaration names, kinds, selectors and member **counts** — 14× smaller on `table`, 45× on `multiselect` |
| `declaration` | one declaration, in full |

Truncating silently would have been worse than the size: a caller could not tell a small module
from a trimmed one.

## What it does not know

- **Only the 64 warranted modules.** The other 53 live in the repository's `attic/` and are not
  supported. `get_module` returns an explicit miss for them rather than an empty success,
  because "unsupported" and "supported but declares nothing" must not look the same.
- **Defaults are mostly undocumented.** Only 127 of 1205 inputs declare `@defaultValue`. The
  corpus marks the rest as undeclared rather than omitting the field, so the gap stays visible
  to a reading model instead of being filled with a guess.
- **69 inputs are deprecated.** Each carries its replacement.

## What this server is proven to do — and what it is not

Two different claims, kept apart on purpose. One is verified in CI; the other is not verified at
all, and saying so is cheaper than being caught overstating it.

### ✅ Proven: the answer is here, and PrimeNG's is not

`test/sufficiency.test.mjs` drives the real binary over real stdio and asserts, for all **20**
benchmark questions:

- every question is answerable in **at most two tool calls** — measured by counting calls, not
  assumed from the shape of the code;
- the PrimeNG answer is **absent** from what the lookup hands back;
- given the wrong answer, `check_usage` rejects it and **names the right one**.

Verdicts are scored by `grade()`, the same function the paid harness uses, so the free gate and
the paid one cannot drift apart. Free, offline, deterministic, part of `npm run test:tools`.

**Mutation-proven**, because a new gate that passes first try has not earned trust: rewriting the
selector to `p-*` in `tools.mjs` reddens the answerability and absence tests; making `check_usage`
always return `ok: true` reddens the correction test; adding an unhandled question kind reddens
the coverage guard. Each mutation reddened only its own test.

### ⏸️ Not proven: that assistants actually behave better

The sufficiency gate says **nothing about model behaviour.** It proves the data source is
sufficient, not that an assistant chooses to consult it. The honest reading: a model that still
writes `p-button` **did not look** — as opposed to looked and found nothing.

`benchmark/` holds a two-arm harness for that stronger claim (the spec's **AC-12b**): the same 20
questions with the tools attached and again with no tools as a control. **It has never been run.**
It needs Anthropic API credit, which is billed **separately** from a Claude Code subscription, and
that spend was declined on 2026-07-30. It is an **opt-in tool, not a gate**.

If you want the number, one command — and the result gets committed whichever way it goes:

```
node packages/angulux-mcp/benchmark/run.mjs --sample --effort medium   # 5 questions, one per kind
node packages/angulux-mcp/benchmark/run.mjs                            # all 20
```

Prefer `--sample` over `--limit 5` for a cheap probe: the question set is grouped by kind, so
`--limit 5` would ask five selector questions and none of the other four.
