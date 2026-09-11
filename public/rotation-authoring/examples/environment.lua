---@type RotationEnv
local NX = ...

local spells = NX.SpellBook:GetGlobal()
local player = NX.UnitManager.Get("player")
local target = NX.UnitManager.Get("target")

return spells, player, target
