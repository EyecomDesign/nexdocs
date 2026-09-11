---@type RotationEnv
local NX = ...

-- This file is the canonical source used by the bilingual authoring course.
-- It is intentionally small: levels 1-20, TBC, global spellbook, no class
-- framework changes. Keep the examples here aligned with the course pages.

local spells = NX.SpellBook:GetGlobal()

local DemonSkin        = spells.DemonSkin
local Corruption       = spells.Corruption
local CurseOfAgony     = spells.CurseOfAgony
local Immolate         = spells.Immolate
local ShadowBolt       = spells.ShadowBolt
local LifeTap          = spells.LifeTap
local HealthFunnel      = spells.HealthFunnel
local CreateHealthstone = spells.CreateHealthstone

-- ============================================================
-- Constants
-- ============================================================
local MAX_MULTIPULL_TARGETS = 3
local HEALTHSTONE_MIN_HEALTH = 35
local HEALTHSTONE_ITEM_IDS = {
    -- Item IDs, not spell IDs. The list covers the legacy/TBC healthstones.
    5512, 5511, 5510, 5509, 9421, 19004, 19005, 19006,
    19007, 19008, 19009, 19010, 19011, 19012, 19013,
}

local petHeldForGather = false

local function Player()
    return NX.UnitManager.Get("player")
end

local function Target()
    return NX.UnitManager.Get("target")
end

local function Pet()
    return NX.UnitManager.Get("pet")
end

local function DamageEnabled()
    return NX.Toggles["Damage"] ~= false
end

local function ItemsEnabled()
    return NX.Toggles["Items"] ~= false
end

local function PetEnabled()
    return NX.Toggles["Pet"] ~= false
end

local function HasHealthstone()
    for _, itemID in ipairs(HEALTHSTONE_ITEM_IDS) do
        if NX.Item.GetItemCount(itemID) > 0 then
            return true
        end
    end

    return false
end

local function UseHealthstone()
    local threshold = tonumber(NX.Options["Healthstone Percent"] or HEALTHSTONE_MIN_HEALTH)
        or HEALTHSTONE_MIN_HEALTH
    if not ItemsEnabled() or (Player():GetHP() or 100) > threshold then
        return false
    end

    for _, itemID in ipairs(HEALTHSTONE_ITEM_IDS) do
        if NX.Item.GetItemCount(itemID) > 0 then
            return NX.Item.UseItemByID(itemID) == true
        end
    end

    return false
end

local function Execute(spell)
    if spell and spell.Execute then
        return spell:Execute() == true
    end

    return false
end

local function AttachDamageSpell(spell, refresh)
    if not spell then
        return
    end

    spell:CastableIf(function()
        local target = Target()
        return DamageEnabled() and target:IsEnemy() and refresh(target)
    end)
    spell:SetTarget(Target)
end

-- Target selection belongs to the spell attachment. The pulse only expresses
-- priority; Execute() supplies the normal known/cooldown/range/LOS gates.
AttachDamageSpell(Corruption, function(target)
    return not target:HasMyDebuff(Corruption)
end)
AttachDamageSpell(CurseOfAgony, function(target)
    return not target:HasMyDebuff(CurseOfAgony)
end)
AttachDamageSpell(Immolate, function(target)
    return not target:HasMyDebuff(Immolate)
end)
AttachDamageSpell(ShadowBolt, function()
    return true
end)

if DemonSkin then
    DemonSkin:CastableIf(function()
        return NX.Toggles["Buffs"] ~= false and not Player():HasMyBuff(DemonSkin)
    end)
end

if HealthFunnel then
    -- Health Funnel remains Warlock rotation policy. Generic pet healing is a
    -- different concern and belongs to the Pet Module's documented API.
    HealthFunnel:CastableIf(function()
        local pet = Pet()
        return PetEnabled()
            and NX.Pet.IsPetActive()
            and (pet:GetHP() or 100) < 50
            and (Player():GetHP() or 100) > 40
    end)
    HealthFunnel:SetTarget(Pet)
end

if LifeTap then
    LifeTap:CastableIf(function()
        local healthstonePercent = tonumber(NX.Options["Healthstone Percent"] or HEALTHSTONE_MIN_HEALTH)
            or HEALTHSTONE_MIN_HEALTH
        return DamageEnabled()
            and (Player():GetPP() or 100) < 25
            and (Player():GetHP() or 100) > healthstonePercent
    end)
end

if CreateHealthstone then
    CreateHealthstone:CastableIf(function()
        return ItemsEnabled() and not HasHealthstone()
    end)
end

local function MaintainPetOutOfCombat()
    if PetEnabled() and NX.Pet.Maintain() then
        return true
    end

    return false
end

local function AssistPetInCombat()
    if PetEnabled() and NX.Pet.Assist() then
        return true
    end

    return false
end

local function HoldPetForGather()
    if not PetEnabled() or petHeldForGather then
        return
    end

    -- These are edge-triggered commands. Do not repeat them every pulse.
    NX.Pet.CommandPetStopAttack()
    NX.Pet.CommandPetPassive()
    NX.Pet.CommandPetFollow()
    petHeldForGather = true
end

local function RestorePetAfterGather()
    if not petHeldForGather then
        return
    end

    NX.Pet.CommandPetDefensive()
    petHeldForGather = false
end

local function SelectMultipullTargets()
    local selected = {}
    NX.UnitManager.EnumActiveEnemies(function(enemy)
        if enemy:IsEnemy() then
            selected[#selected + 1] = enemy
        end
        return #selected >= MAX_MULTIPULL_TARGETS
    end)
    return selected
end

local function ApplyInstantDots(targets)
    if not DamageEnabled() then
        return false
    end

    for _, enemy in ipairs(targets) do
        if Corruption
            and not enemy:HasMyDebuff(Corruption)
            and Corruption:Cast(enemy)
        then
            return true
        end

        if CurseOfAgony
            and not enemy:HasMyDebuff(CurseOfAgony)
            and CurseOfAgony:Cast(enemy)
        then
            return true
        end
    end

    return false
end

local Rotation = {
    Info = {
        Name = "Warlock TBC Authoring Tutorial",
        Title = "Warlock TBC — Level 1-20 Authoring Tutorial",
    },

    Toggles = {
        ["Pause"] = { Description = "Pause the rotation", Default = false },
        ["Buffs"] = { Description = "Maintain self buffs", Default = true },
        ["Damage"] = { Description = "Use damage and mana priorities", Default = true },
        ["Items"] = { Description = "Create and use Healthstones", Default = true },
        ["Pet"] = { Description = "Use the Pet Module", Default = true },
        ["Wand"] = { Description = "Allow framework wand maintenance", Default = true },
        ["Multipull"] = { Description = "Use the explicit three-target pulse", Default = true },
    },

    Options = {
        { Name = "Mana and health" },
        {
            Name = "Healthstone Percent",
            Type = "Slider",
            Min = 1,
            Max = 100,
            Step = 0.1,
            Precision = 0.1,
            Default = 35.0,
            Description = "Use a Healthstone at or below this player health percentage.",
        },
        {
            Name = "Dot Refresh Seconds",
            Type = "Slider",
            Min = 0,
            Max = 10,
            Step = 0.1,
            Precision = 0.1,
            Default = 1.5,
            Description = "Example fractional slider used by later rotation policy.",
        },
    },

    -- The OOC pulse drains work. true means keep asking for OOC work;
    -- false lets the engine leave this state.
    OutOfCombatPulse = function()
        if NX.Toggles["Pause"] then
            return false
        end

        if MaintainPetOutOfCombat() then
            return true
        end

        if Execute(DemonSkin) then
            return true
        end

        if ItemsEnabled() and not HasHealthstone() and Execute(CreateHealthstone) then
            return true
        end

        return false
    end,

    EngagementPulse = function()
        if NX.Toggles["Pause"] then
            return false
        end

        if AssistPetInCombat() then
            return true
        end

        if Execute(Corruption) then
            return true
        end
        if Execute(CurseOfAgony) then
            return true
        end
        if Execute(Immolate) then
            return true
        end
        if Execute(ShadowBolt) then
            return true
        end

        return false
    end,

    CombatPulse = function()
        if NX.Toggles["Pause"] then
            return false
        end

        -- Maintain is intent only. The framework owns the continuous wand
        -- cadence and re-checks the running priority ladder after this pulse.
        if NX.Toggles["Wand"] ~= false then
            NX.Wand.Maintain()
        end

        if UseHealthstone() then
            return true
        end
        if Execute(HealthFunnel) then
            return true
        end
        if AssistPetInCombat() then
            return true
        end
        if Execute(DemonSkin) then
            return true
        end
        if Execute(Corruption) then
            return true
        end
        if Execute(CurseOfAgony) then
            return true
        end
        if Execute(Immolate) then
            return true
        end
        if Execute(LifeTap) then
            return true
        end
        if Execute(ShadowBolt) then
            return true
        end

        return false
    end,

    -- MultiPull is explicit so a rotation can state its own target cap and
    -- temporary pet policy. The normal engine still owns navigation.
    MultiPullPulse = function()
        if NX.Toggles["Pause"] or NX.Toggles["Multipull"] == false then
            RestorePetAfterGather()
            return false
        end

        HoldPetForGather()
        local targets = SelectMultipullTargets()
        if ApplyInstantDots(targets) then
            return true
        end

        RestorePetAfterGather()
        return false
    end,
}

return Rotation
