# Sandbox developer guide validation (NexorBot#1843)

Bot reference: NexorSystem/NexorBot `Development` at ec0133a82 (after #1839 and #1840 merged), exported with `git archive`.

- `python scripts/verify-sandbox-guide.py --bot-repo <bot-checkout> --output <report.json>`: 27/27 examples on `content/en/developer/sandbox.mdx` behave as documented. 21 run in a sandbox opened by the real `SandboxBuilder` over the real public NX (only the game is faked, through the bot's own `tests/public_api_one_nx_test.py` harness): 11 `works`, 9 `fails` with the documented message and author `file:line`, 1 `fails-after-close`. 6 in-game examples (spell layers, pause/resume, timers, rotation pulse) are `compiles`; their behaviour is covered by the bot's `spell_layers_test.py` and `sandbox_cleanup_test.py`. See `examples.json`.
- Mutation check: a changed error message, a wrong line number and a `works` example that writes to NX each failed the verifier.
- pnpm typecheck: PASS. pnpm lint: 0 errors, 17 existing anonymous-default-export warnings. pnpm test: 3/3 PASS. pnpm build: PASS, 85 static pages; both in-page anchors and the two new links resolve in the generated HTML.

## Known bot defects (not fixed here)

The rules behave as documented. The error text does not yet match the format from spec #1833 (`<product> (<source>) - <file>:<line>: <message>`). The guide documents the spec's format, and the verifier names each defect on every run:

- `duplicate-prefix`: rule errors raised with `error(sandbox:FormatError(...), 2)` get Lua's location in front, then `ScriptSandbox:Call` prefixes again: `demo (disk: Docs) - Rotations/Demo.lua:3: demo (disk: Docs) - NX is read-only ...` (7 examples).
- `internal-location`: errors raised inside an NX call at level 3 (`SetRotationMovementOverride` outside the rotation, `NX.ChatCommand.Register` on a taken name) point at `src/systems/SandboxBuilder.lua:388` instead of the author line (2 examples).
- `location-first`: a closed sandbox's NX called from a game timer reports `Rotations/Demo.lua:4: demo (disk: Docs) - sandbox is closed ...` (1 example).

Written in English only: nexdocs is English-only (`CLAUDE.md`, German tree disabled), which supersedes the ticket's "bilingual format". No in-game result is claimed.
