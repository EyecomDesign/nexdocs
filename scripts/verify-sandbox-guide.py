"""Run every checked example in the sandbox guide against a real bot checkout.

Each Lua block in content/en/developer/sandbox.mdx that follows an MDX comment
`{/* check: <mode> [setup=<name>] [file=<path>] */}` is executed in a sandbox opened
by the bot's real SandboxBuilder over the real public NX (only the game is faked,
through the bot's own test harness). Modes:

  works              runs without an error
  fails              stops with the error shown in the ```text block that follows
  fails-after-close  runs, the sandbox closes, then the timer callback it started
                     fails with the error shown in the ```text block that follows
  compiles           compiles only (in-game behaviour, covered by the bot's own tests)

Requires lupa (Lua 5.1). Usage:
  python scripts/verify-sandbox-guide.py --bot-repo <NexorBot checkout>
"""
from pathlib import Path
import argparse
import json
import re
import subprocess
import sys

from lupa.lua51 import LuaRuntime

parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
parser.add_argument('--bot-repo', type=Path, required=True)
parser.add_argument('--bot-ref', help='bot commit the checkout was made from (recorded when it is not a git repo)')
parser.add_argument('--output', type=Path, help='write a JSON result record here')
args = parser.parse_args()
BOT = args.bot_repo.resolve()
DOCS = Path(__file__).resolve().parents[1]
PAGE = DOCS / 'content/en/developer/sandbox.mdx'

sys.path.insert(0, str(BOT))
sys.path.insert(0, str(BOT / 'tests'))
from public_api_one_nx_test import boot  # noqa: E402

CHECK = re.compile(
    r'\{/\* check: (?P<mode>[\w-]+)(?P<attrs>[^*]*)\*/\}\n```lua\n(?P<code>.*?)```'
    r'(?:\n\n```text\n(?P<expected>.*?)\n```)?',
    re.S,
)

# Fake only what the game provides; everything script-visible is the real bot code.
GAME = '''
SlashCmdList, hash_SlashCmdList, hash_ChatTypeInfoList = {}, {}, {}
timers = {}
C_Timer = {
    After = function(_, callback) timers[#timers + 1] = callback end,
    NewTicker = function(_, callback)
        timers[#timers + 1] = callback
        return { Cancel = function() end }
    end,
}
Unit = {
    GetHealth = function(self) return self.health end,
    GetGUID = function() return "Player-1-00000001" end,
}
Unit.__index = Unit
unit = setmetatable({ health = 37 }, Unit)
nex.UnitManager.Get = function() return unit end
nex.UnitManager.GetActiveEnemiesInRangeCount = function()
    return { setmetatable({ health = 50 }, Unit), unit }
end
nex.Tables.Items.Healthstones = { 5512, 5511 }
builder = nex.SandboxBuilder
'''

SETUPS = {
    'other-owns-demo': '''
        local other = builder.Open({ key = 'disk:Docs/other', slug = 'other', source = 'disk: Docs' })
        local chunk = assert(other:Compile(
            'local NX = ...; NX.ChatCommand.Register("demo", function() end)', 'other.lua'))
        assert(other:Run(chunk, nex.PublicEnv))
    ''',
}

RUN = '''
function(code, file)
    local box = builder.Open({ key = 'disk:Docs/demo', slug = 'demo', source = 'disk: Docs' },
        { namespace = {} })
    local chunk, err = box:Compile(code, file)
    if not chunk then return false, err end
    local ok, result = box:Run(chunk, nex.PublicEnv, box.namespace)
    return ok, tostring(result), box
end
'''

AFTER_CLOSE = '''
function(box)
    box:Close()
    assert(#timers > 0, 'the example started no timer')
    local ok, err = pcall(timers[#timers])
    return ok, tostring(err)
end
'''


def attributes(text):
    return dict(part.split('=', 1) for part in text.split())


def first_line(text):
    return text.strip().splitlines()[0]


def compare(actual, expected):
    """An error passes when its first line is exactly the documented line."""
    line = first_line(actual)
    return line == expected, line


def run(check):
    mode, code, expected = check['mode'], check['code'], check['expected']
    attrs = attributes(check['attrs'])
    if mode == 'compiles':
        ok, err = LuaRuntime().eval('function(s) local f, e = loadstring(s); return f ~= nil, e end')(code)
        return ok, err
    lua, harness = boot()
    lua.globals().nex = harness.nex
    lua.execute(GAME)
    harness.LoadModule((BOT / 'src/api/utils/slash.lua').read_text(encoding='utf-8-sig'), 'slash')
    if 'setup' in attrs:
        lua.execute(SETUPS[attrs['setup']])
    ok, result, box = lua.eval(RUN)(code, attrs.get('file', 'Rotations/Demo.lua'))
    if mode == 'works':
        return ok, result
    if mode == 'fails':
        if ok:
            return False, 'expected an error, the example ran'
        return compare(result, expected)
    if mode == 'fails-after-close':
        if not ok:
            return False, result
        passed, err = lua.eval(AFTER_CLOSE)(box)
        if passed:
            return False, 'expected an error after close, the callback ran'
        return compare(err, expected)
    return False, f'unknown check mode {mode!r}'


page = PAGE.read_text(encoding='utf-8')
checks = [dict(m.groupdict(), line=page.count(chr(10), 0, m.start()) + 3)
          for m in CHECK.finditer(page)]
marked = page.count('{/* check:')
assert marked == len(checks), f'{marked} check markers but {len(checks)} parsed examples'
results, failures = [], 0
for index, check in enumerate(checks, 1):
    if check['mode'].startswith('fails') and not check['expected']:
        ok, detail = False, 'a failing example needs a ```text block with its error'
    else:
        ok, detail = run(check)
    line = check['line']
    results.append({'line': line, 'mode': check['mode'], 'passed': bool(ok), 'detail': detail})
    if not ok:
        failures += 1
        print(f'FAIL sandbox.mdx:{line} [{check["mode"]}]\n  expected: {check["expected"]}\n  actual:   {detail}')

try:
    checkout = subprocess.check_output(['git', '-C', str(BOT), 'rev-parse', 'HEAD'], text=True,
                                       stderr=subprocess.DEVNULL).strip()
except (subprocess.CalledProcessError, FileNotFoundError):
    checkout = args.bot_ref
if args.bot_ref and checkout != args.bot_ref:
    sys.exit(f'bot checkout {checkout} is not --bot-ref {args.bot_ref}')
summary = {'bot_checkout': checkout, 'examples': len(results), 'failed': failures, 'results': results}
if args.output:
    args.output.write_text(json.dumps(summary, indent=2) + '\n')
print(f'{len(results) - failures}/{len(results)} sandbox guide examples behave as documented')
sys.exit(1 if failures else 0)
