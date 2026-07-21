<!-- code-graph-mcp:begin v2 -->
## Code Graph (repo-wide AST index)

AST + FTS + vector index of the whole repo — prefer over multi-round Grep/Read for
structural queries (LSP only sees open files; this sees everything). Fastest path = Bash CLI:

| Intent | Command |
|--------|---------|
| Who calls X / what X calls | `code-graph-mcp callgraph X` |
| Impact before editing a fn | `code-graph-mcp impact X` |
| Unfamiliar dir / module | `code-graph-mcp overview <dir>` |
| Symbol source / signature | `code-graph-mcp show X` |
| Concept search (no exact name) | `code-graph-mcp search "…"` (vector: MCP `semantic_code_search`) |
| grep + AST context | `code-graph-mcp grep "pat" [paths] [-t lang] [-g glob] [-c]` |

Still use Grep for literal strings/regex in non-code files; still Read files you'll edit.
Full command + MCP-tool table: `.claude/plugin_code_graph_mcp.md`
<!-- code-graph-mcp:end -->

## gstack

Use the `/browse` skill (gstack) for all web browsing — page fetches, screenshots,
scraping, QA against a running app. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:

`/office-hours` `/plan-ceo-review` `/plan-eng-review` `/plan-design-review`
`/design-consultation` `/design-shotgun` `/design-html` `/review` `/ship`
`/land-and-deploy` `/canary` `/benchmark` `/browse` `/connect-chrome` `/qa`
`/qa-only` `/design-review` `/setup-browser-cookies` `/setup-deploy`
`/setup-gbrain` `/retro` `/investigate` `/document-release` `/document-generate`
`/codex` `/cso` `/autoplan` `/plan-devex-review` `/devex-review` `/careful`
`/freeze` `/guard` `/unfreeze` `/gstack-upgrade` `/learn`
