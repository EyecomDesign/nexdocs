---@type RotationEnv
local NX = ...

local spells = NX.SpellBook:GetGlobal()
local Corruption = spells.Corruption
local CurseOfAgony = spells.CurseOfAgony
local HealthFunnel = spells.HealthFunnel

local function Target()
    return NX.UnitManager.Get("target")
end

local function Pet()
    return NX.UnitManager.Get("pet")
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

return {
    OutOfCombatPulse = function()
        if NX.Pet.Maintain() then return true end
        return false
    end,
    EngagementPulse = function()
        if NX.Pet.Assist() then return true end
        if Corruption and Corruption:Execute() then return true end
        if CurseOfAgony and CurseOfAgony:Execute() then return true end
        return false
    end,
    CombatPulse = function()
        if HealthFunnel and HealthFunnel:Execute() then return true end
        if NX.Pet.Assist() then return true end
        if Corruption and Corruption:Execute() then return true end
        if CurseOfAgony and CurseOfAgony:Execute() then return true end
        return false
    end,
}
