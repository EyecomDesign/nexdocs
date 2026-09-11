---@type RotationEnv
local NX = ...

local spells = NX.SpellBook:GetGlobal()
local Corruption = spells.Corruption
local CurseOfAgony = spells.CurseOfAgony
local HealthFunnel = spells.HealthFunnel
local CreateHealthstone = spells.CreateHealthstone
local HEALTHSTONE_ITEM_IDS = { 5512, 5511, 5510, 5509 }

local function Target()
    return NX.UnitManager.Get("target")
end

local function Pet()
    return NX.UnitManager.Get("pet")
end

local function HasHealthstone()
    for _, itemID in ipairs(HEALTHSTONE_ITEM_IDS) do
        if NX.Item.GetItemCount(itemID) > 0 then return true end
    end
    return false
end

local function UseHealthstone()
    for _, itemID in ipairs(HEALTHSTONE_ITEM_IDS) do
        if NX.Item.GetItemCount(itemID) > 0 then
            return NX.Item.UseItemByID(itemID) == true
        end
    end
    return false
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
if HealthFunnel then
    HealthFunnel:CastableIf(function()
        return NX.Pet.IsPetActive()
            and (Pet():GetHP() or 100) < 50
            and (NX.UnitManager.Get("player"):GetHP() or 100) > 40
    end)
    HealthFunnel:SetTarget(Pet)
end
if CreateHealthstone then
    CreateHealthstone:CastableIf(function()
        return NX.Toggles["Items"] ~= false and not HasHealthstone()
    end)
end

return {
    Toggles = {
        ["Damage"] = { Description = "Use damage priorities", Default = true },
        ["Items"] = { Description = "Use Healthstones", Default = true },
        ["Pet"] = { Description = "Use the Pet Module", Default = true },
        ["Wand"] = { Description = "Allow wand maintenance", Default = true },
    },
    Options = {
        {
            Name = "Dot Refresh Seconds",
            Type = "Slider",
            Min = 0,
            Max = 10,
            Step = 0.1,
            Precision = 0.1,
            Default = 1.5,
        },
    },
    OutOfCombatPulse = function()
        if NX.Pet.Maintain() then return true end
        if CreateHealthstone and CreateHealthstone:Execute() then return true end
        return false
    end,
    EngagementPulse = function()
        if NX.Pet.Assist() then return true end
        if Corruption and Corruption:Execute() then return true end
        if CurseOfAgony and CurseOfAgony:Execute() then return true end
        return false
    end,
    CombatPulse = function()
        if NX.Toggles["Wand"] ~= false then NX.Wand.Maintain() end
        if NX.Toggles["Items"] ~= false and UseHealthstone() then return true end
        if HealthFunnel and HealthFunnel:Execute() then return true end
        if NX.Pet.Assist() then return true end
        if Corruption and Corruption:Execute() then return true end
        if CurseOfAgony and CurseOfAgony:Execute() then return true end
        return false
    end,
}
