# angulux-mcp

An [MCP](https://modelcontextprotocol.io) server that answers questions about
[angulux](https://github.com/anguless-com/angulux) from the generated API corpus.

Angulux is a 2026 fork, so no model has seen it. Ask an assistant how to render a button and
it will answer with PrimeNG's `<p-button>`, because that is the only thing in its training
data. This server lets the assistant look the answer up instead.

Everything it returns comes from `corpus/corpus.json`, which is generated from the library's
own TypeScript and gated against drift by `check:corpus`. The server reads that file and
nothing else — it makes no network request.

## Status: not published, by decision

This package is `private: true` and is **not on npm**. The owner's decision (2026-07-29) was
to build it now and decide publishing later, at the Angular 23 window — the library's API is
scheduled for redesign then, and an npm version number cannot be un-burned. Run it from a
checkout in the meantime.

## Running it

```
node packages/angulux-mcp/bin/angulux-mcp.mjs
```

It speaks MCP over stdio. See the repository README for wiring it into a client.
