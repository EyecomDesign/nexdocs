---@type NX
local NX = ...

-- ============================================================
-- Spell definitions
-- ============================================================
local spells = NX.SpellBook:GetGlobal()

local Corruption   = spells.Corruption
local CurseOfAgony = spells.CurseOfAgony

-- ============================================================
-- Unit definitions
-- ============================================================
local Target = NX.UnitManager.Get("target")

-- ============================================================
-- Spell conditions
-- ============================================================
Corruption:CastableIf(function()
    return NX.Toggles["Damage"] and not Target:HasMyDebuff(Corruption)
end):SetTarget(Target)

CurseOfAgony:CastableIf(function()
    return NX.Toggles["Damage"] and not Target:HasMyDebuff(CurseOfAgony)
end):SetTarget(Target)

-- ============================================================
-- Rotation
-- ============================================================
local Rotation = {
    Toggles = {
        ["Damage"] = { Description = "Use damage priorities", Default = true },
    },
    Options = {},
    OutOfCombatPulse = function()
        return false
    end,
    EngagementPulse = function()
        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
    end,
    CombatPulse = function()
        NX.Wand.Maintain()

        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
    end,
}

return Rotation
