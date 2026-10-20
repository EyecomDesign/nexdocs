---@type NX
local NX = ...
local PetModule = NX.Import("PetModule")

-- ============================================================
-- Spell definitions
-- ============================================================
local spells = NX.SpellBook:GetGlobal()

local DemonSkin       = spells.DemonSkin
local Corruption      = spells.Corruption
local CurseOfAgony    = spells.CurseOfAgony
local Immolate        = spells.Immolate
local ShadowBolt      = spells.ShadowBolt
local LifeTap         = spells.LifeTap
local HealthFunnel    = spells.HealthFunnel
local CreateSoulstone = spells.CreateSoulstone

-- ============================================================
-- Constants
-- ============================================================
local MAX_MULTIPULL_TARGETS = 3
local SOULSTONES            = NX.Tables.Items.Soulstones

-- ============================================================
-- Unit definitions
-- ============================================================
local Player = NX.UnitManager.Get("player")
local Target = NX.UnitManager.Get("target")
local Pet    = NX.UnitManager.Get("pet")

local CorruptionTarget = NX.UnitManager.CreateCustomUnit("CorruptionTarget", function()
    if Target:IsEnemy() and Target:MyDebuff(Corruption):GetRemainingTime() <= Corruption:GetCastTime() then
        return Target
    end

    local enemies = NX.UnitManager.GetActiveEnemies()
    for index = 1, math.min(#enemies, MAX_MULTIPULL_TARGETS) do
        local enemy = enemies[index]
        if enemy:IsEnemy() and enemy:MyDebuff(Corruption):GetRemainingTime() <= Corruption:GetCastTime() then
            return enemy
        end
    end

    return NX.UnitManager.Get("none")
end)

local CurseOfAgonyTarget = NX.UnitManager.CreateCustomUnit("CurseOfAgonyTarget", function()
    if Target:IsEnemy() and not Target:HasMyDebuff(CurseOfAgony) then
        return Target
    end

    local enemies = NX.UnitManager.GetActiveEnemies()
    for index = 1, math.min(#enemies, MAX_MULTIPULL_TARGETS) do
        local enemy = enemies[index]
        if enemy:IsEnemy() and not enemy:HasMyDebuff(CurseOfAgony) then
            return enemy
        end
    end

    return NX.UnitManager.Get("none")
end)

-- ============================================================
-- Shared functions
-- ============================================================
local function FindSoulstoneInBags()
    for index = #SOULSTONES, 1, -1 do
        local soulstone = SOULSTONES[index]
        if NX.Item.GetItemCount(soulstone.itemID) > 0 then
            return soulstone
        end
    end

    return nil
end

local function HasAnySoulstoneBuff()
    for _, soulstone in ipairs(SOULSTONES) do
        if Player:HasBuff(soulstone.spellID) then return true end
    end

    return false
end

local function UseSoulstoneOnPlayer()
    local soulstone = FindSoulstoneInBags()

    return soulstone
        and not HasAnySoulstoneBuff()
        and not Player:IsMoving()
        and NX.Spell.GetCooldownRemaining(soulstone.spellID) <= 0
        and NX.Item.UseItemByID(soulstone.itemID, "player")
end

-- ============================================================
-- Spell conditions
-- ============================================================
Corruption:CastableIf(function()
    return NX.Toggles["Damage"]
end):SetTarget(CorruptionTarget)

CurseOfAgony:CastableIf(function()
    return NX.Toggles["Damage"]
end):SetTarget(CurseOfAgonyTarget)

Immolate:CastableIf(function()
    return NX.Toggles["Damage"] and not Target:HasMyDebuff(Immolate)
end):SetTarget(Target)

ShadowBolt:CastableIf(function()
    return NX.Toggles["Damage"]
end):SetTarget(Target)

DemonSkin:CastableIf(function()
    return NX.Toggles["Buffs"] and not Player:HasMyBuff(DemonSkin)
end)

HealthFunnel:CastableIf(function()
    return NX.Toggles["Pet"]
        and NX.Pet.IsPetActive()
        and Pet:GetHP() < NX.Options["Health Funnel Pet Health Percent"]
        and Player:GetHP() > NX.Options["Minimum Health Percent"]
end):SetTarget(Pet)

LifeTap:CastableIf(function()
    return NX.Toggles["Damage"]
        and Player:GetPP() < NX.Options["Life Tap Mana Percent"]
        and Player:GetHP() > NX.Options["Minimum Health Percent"]
end)

CreateSoulstone:CastableIf(function()
    return NX.Options["Use Soulstone"] and not FindSoulstoneInBags()
end)

-- ============================================================
-- Rotation
-- ============================================================
local Rotation = {
    Toggles = {
        ["Buffs"] = { Description = "Keep Demon Skin up.", Default = true },
        ["Damage"] = { Description = "Cast damage spells and Life Tap.", Default = true },
        ["Pet"] = { Description = "Summon and heal your pet and send it to attack.", Default = true },
    },

    Options = {
        {
            Name = "Mana and health",
            {
                Name = "Life Tap Mana Percent",
                Type = "Slider",
                Min = 1,
                Max = 100,
                Default = 25,
                Description = "Use Life Tap when your mana is below this percent.",
            },
            {
                Name = "Minimum Health Percent",
                Type = "Slider",
                Min = 1,
                Max = 100,
                Default = 35,
                Description = "Use Life Tap and Health Funnel only when your health is above this percent.",
            },
            {
                Name = "Health Funnel Pet Health Percent",
                Type = "Slider",
                Min = 1,
                Max = 100,
                Default = 50,
                Description = "Use Health Funnel when your pet's health is below this percent.",
            },
        },
        {
            Name = "Items",
            {
                Name = "Use Soulstone",
                Type = "Checkbox",
                Default = true,
                Description = "Create a Soulstone and use it on yourself.",
            },
        },
        PetModule.SettingsBlock(),
    },

    OutOfCombatPulse = function()
        if NX.Toggles["Pet"] and PetModule.Maintain() then return true end

        if DemonSkin:Execute() then return true end

        if CreateSoulstone:Execute() then return true end
        if NX.Options["Use Soulstone"] and UseSoulstoneOnPlayer() then return true end

        return false
    end,

    EngagementPulse = function()
        if NX.Toggles["Pet"] and PetModule.Assist() then return true end

        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
        if Immolate:Execute() then return true end
        if ShadowBolt:Execute() then return true end
    end,

    CombatPulse = function()
        NX.Wand.Maintain()

        if HealthFunnel:Execute() then return true end
        if NX.Toggles["Pet"] and PetModule.Assist() then return true end

        if DemonSkin:Execute() then return true end

        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
        if Immolate:Execute() then return true end
        if LifeTap:Execute() then return true end
        if ShadowBolt:Execute() then return true end
    end,

    MultiPullPulse = function()
        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
    end,
}

return Rotation
