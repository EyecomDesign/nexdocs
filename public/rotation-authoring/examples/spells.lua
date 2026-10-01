local spells = NX.SpellBook:GetGlobal()
local Corruption = spells.Corruption
local target = NX.UnitManager.Get("target")

Corruption:CastableIf(function()
    return NX.Toggles["Damage"] ~= false
        and target:IsEnemy()
        and not target:HasMyDebuff(Corruption)
end)
Corruption:SetTarget(function()
    return NX.UnitManager.Get("target")
end)

return Corruption:Execute()
