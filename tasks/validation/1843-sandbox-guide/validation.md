# Sandbox developer guide validation (NexorBot#1843)

Bot reference: NexorSystem/NexorBot `Development` at ec0133a823b59dc1b524dcd8ab902d4e58f01fbb (after #1839 and #1840 merged), exported with `git archive`.

- `python scripts/verify-sandbox-guide.py --bot-repo <bot-checkout> --bot-ref ec0133a823b59dc1b524dcd8ab902d4e58f01fbb --output examples.json`: 27/27 examples on `content/en/developer/sandbox.mdx` behave as documented. 21 run in a sandbox opened by the real `SandboxBuilder` over the real public NX (only the game is faked, through the bot's own `tests/public_api_one_nx_test.py` harness): 11 `works`, 9 `fails` with the documented message and author `file:line`, 1 `fails-after-close`. 6 in-game examples (spell layers, pause/resume, timers, rotation pulse) are `compiles`; their behaviour is covered by the bot's `spell_layers_test.py` and `sandbox_cleanup_test.py`. See `examples.json`.
- Mutation check: a changed error message, a wrong line number and a `works` example that writes to NX each failed the verifier.
- git diff --check: PASS. pnpm typecheck: PASS. pnpm lint: 0 errors, 17 existing anonymous-default-export warnings. pnpm test: 3/3 PASS. pnpm build: PASS, 85 static pages; both in-page anchors and the two new links resolve in the generated HTML.

## Bot error-text defects: fixed in NexorBot#1902

The first version of the guide carried a warning callout, and the verifier tolerated three bot defects: a duplicate prefix, an internal location, and the location before the prefix. NexorSystem/NexorBot PR #1904 fixed all three, merged at `Development@426580f5a988a79ec6a506efcf912510946a87b7`, with live in-game evidence on NexorBot#1902.

The callout and the verifier's defect tolerance are gone. The verifier now requires the exact documented first line:
- `--bot-ref 426580f5a988a79ec6a506efcf912510946a87b7`: 27/27 (`examples.json`).
- The same strict verifier against the old `ec0133a82`: 18/27, failing on exactly the 9 examples whose error text was wrong.

Written in English only: nexdocs is English-only (`CLAUDE.md`, German tree disabled), which supersedes the ticket's "bilingual format". No in-game result is claimed.
