---@type NX
local NX = ...
local PetModule = NX.Import("PetModule")

-- ============================================================
-- Spell definitions
-- ============================================================
local spells = NX.SpellBook:GetGlobal()

local Corruption   = spells.Corruption
local CurseOfAgony = spells.CurseOfAgony
local HealthFunnel = spells.HealthFunnel

-- ============================================================
-- Unit definitions
-- ============================================================
local Player = NX.UnitManager.Get("player")
local Target = NX.UnitManager.Get("target")
local Pet    = NX.UnitManager.Get("pet")

-- ============================================================
-- Spell conditions
-- ============================================================
Corruption:CastableIf(function()
    return NX.Toggles["Damage"] and not Target:HasMyDebuff(Corruption)
end):SetTarget(Target)

CurseOfAgony:CastableIf(function()
    return NX.Toggles["Damage"] and not Target:HasMyDebuff(CurseOfAgony)
end):SetTarget(Target)

HealthFunnel:CastableIf(function()
    return NX.Toggles["Pet"]
        and NX.Pet.IsPetActive()
        and Pet:GetHP() < NX.Options["Health Funnel Pet Health Percent"]
        and Player:GetHP() > NX.Options["Minimum Health Percent"]
end):SetTarget(Pet)

-- ============================================================
-- Rotation
-- ============================================================
local Rotation = {
    Toggles = {
        ["Damage"] = { Description = "Use damage priorities", Default = true },
        ["Pet"] = { Description = "Manage the pet", Default = true },
    },
    Options = {
        {
            Name = "Mana and health",
            {
                Name = "Minimum Health Percent",
                Type = "Slider",
                Min = 1,
                Max = 100,
                Default = 35,
                Description = "Spend health only above this percent.",
            },
            {
                Name = "Health Funnel Pet Health Percent",
                Type = "Slider",
                Min = 1,
                Max = 100,
                Default = 50,
                Description = "Heal the pet below this health percent.",
            },
        },
        PetModule.SettingsBlock(),
    },
    OutOfCombatPulse = function()
        if NX.Toggles["Pet"] and PetModule.Maintain() then return true end
        return false
    end,
    EngagementPulse = function()
        if NX.Toggles["Pet"] and PetModule.Assist() then return true end

        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
    end,
    CombatPulse = function()
        NX.Wand.Maintain()

        if HealthFunnel:Execute() then return true end
        if NX.Toggles["Pet"] and PetModule.Assist() then return true end

        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
    end,
}

return Rotation
