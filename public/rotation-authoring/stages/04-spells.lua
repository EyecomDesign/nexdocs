---@type RotationEnv
local NX = ...

local spells = NX.SpellBook:GetGlobal()
local Corruption = spells.Corruption
local CurseOfAgony = spells.CurseOfAgony

local function Target()
    return NX.UnitManager.Get("target")
end

local function AttachDot(spell)
    if not spell then return end
    spell:CastableIf(function()
        local target = Target()
        return NX.Toggles["Damage"] ~= false
            and target:IsEnemy()
            and not target:HasMyDebuff(spell)
    end)
    spell:SetTarget(Target)
end

AttachDot(Corruption)
AttachDot(CurseOfAgony)

return {
    OutOfCombatPulse = function()
        return false
    end,
    EngagementPulse = function()
        if Corruption and Corruption:Execute() then return true end
        if CurseOfAgony and CurseOfAgony:Execute() then return true end
        return false
    end,
    CombatPulse = function()
        if Corruption and Corruption:Execute() then return true end
        if CurseOfAgony and CurseOfAgony:Execute() then return true end
        return false
    end,
}
