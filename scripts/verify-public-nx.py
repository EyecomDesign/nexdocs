from pathlib import Path
import json
import re
import sys
import argparse
import subprocess

from lupa.lua51 import LuaRuntime

parser = argparse.ArgumentParser(description='Check public NX documentation against a bot checkout (requires lupa.lua51).')
parser.add_argument('--bot-repo', type=Path, required=True)
parser.add_argument('--bot-ref', default='54f75d7f38fa57f95d868eccda4756938ace84cc')
parser.add_argument('--output', type=Path)
args = parser.parse_args()
BOT = args.bot_repo.resolve()
DOCS = Path(__file__).resolve().parents[1]
subprocess.run(['git', '-C', str(BOT), 'diff', '--quiet', args.bot_ref, 'HEAD', '--',
    'Public', 'src', 'tests'], check=True)
checkout = subprocess.check_output(['git', '-C', str(BOT), 'rev-parse', 'HEAD'], text=True).strip()
sys.path.insert(0, str(BOT))
sys.path.insert(0, str(BOT / 'tests'))
from tools.public_api.removed_names import find_removed_names
from public_api_one_nx_test import boot_with_real_spells
from public_path_distance_test import make

changed = ['bot-and-unlock', 'distance', 'units-and-targets', 'items-wands-settings']
snippets = {}
compiled = 0
for name in changed:
    text = (DOCS / f'content/en/developer/api/{name}.mdx').read_text()
    snippets[name] = re.findall(r'```lua\n(.*?)```', text, re.S)
    for snippet in snippets[name]:
        ok, error = LuaRuntime(unpack_returned_tuples=True).eval(
            'function(s) local f,e=loadstring(s); return f~=nil,e end'
        )(snippet)
        assert ok, (name, error)
        compiled += 1

# Run the actual public distance wrapper/backend through the existing client fixture.
lua, harness = boot_with_real_spells()
lua.globals().NX = harness.nex.PublicEnv
distance = snippets['distance']
for snippet, assertion in [
    (distance[1], 'assert(horizontalDistance == 5)'),
    (distance[2], 'assert(type(closeToTarget) == "boolean")'),
    (distance[3], 'assert(withinFiveYards == true)'),
    (distance[4], 'assert(type(withinBasicMeleeRange) == "boolean" and type(withinThreeYards) == "boolean")'),
]:
    lua.execute(snippet + '\n' + assertion)

# The documented async polling example uses the production public API and distance module.
lua = make()
lua.execute('HARNESS.nex.Functions.Object.ObjectPosition = function(token) '
    'if token=="target" then return 40,20,30 end return 10,20,30 end')
reader, record = lua.execute('local NX=HARNESS.nex.PublicEnv\n' + distance[-1]
    + '\nreturn ReadInitialTargetWalkingDistance, function() return pathDistance end')
first = reader()
assert first[1] == 'pending'
assert record().status == 'pending'
lua.execute('assert(#CALLS==1); Answer(1,Ready(17))')
assert reader() == record().distance and record().status == 'ready'
lua.execute('assert(#CALLS==1)')

# Scan displayed prose, course checkpoints, and the downloadable tutorial source.
hits = []
files = 0
for top in (DOCS / 'content/en', DOCS / 'public/rotation-authoring'):
    for path in top.rglob('*'):
        if path.suffix not in ('.mdx', '.md', '.lua'):
            continue
        files += 1
        for hit in find_removed_names(path.read_text(encoding='utf-8-sig')):
            hits.append([str(path.relative_to(DOCS)), hit.line, hit.name])
assert not hits, hits

# Every newly documented entry has a source declaration and a Lua example on its page.
public = (BOT / 'Public/PublicAPIs.lua').read_text(encoding='utf-8-sig')
functions = ['Bot.State', 'Bot.ActionState', 'Bot.IsEngaging', 'Unlock',
    'UnitManager.GetEnemiesInRange', 'UnitManager.GetActiveEnemiesInRange',
    'Item.HasWeaponEnchant', 'Item.EquipItemByID', 'Distance.GetDistance2D',
    'Distance.IsWithinRange', 'Distance.IsWithinDistance', 'Distance.IsInMelee',
    'Distance.RequestPathDistance']
docs = '\n'.join((DOCS / f'content/en/developer/api/{name}.mdx').read_text() for name in changed)
for function in functions:
    assert 'function PublicEnv.' + function + '(' in public, function
    assert 'NX.' + function + '(' in docs, function

report = {'bot_source': args.bot_ref, 'bot_checkout': checkout,
    'source_comparison': 'Public/src/tests unchanged between bot reference and checkout',
    'lua_snippets_compile': compiled, 'simple_distance_snippets_executed': 4,
    'actual_path_polling_example': 'pending -> ready, one request',
    'public_declarations_checked': len(functions), 'published_source_files_audited': files,
    'removed_name_hits': hits,
    'scope': 'AUTOMATED: real production distance code with controlled client/router inputs; not LIVE'}
if args.output:
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
