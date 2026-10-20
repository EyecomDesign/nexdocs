---@type NX
local NX = ...

-- ============================================================
-- Rotation
-- ============================================================
local Rotation = {
    Toggles = {},
    Options = {},
    OutOfCombatPulse = function()
        return false
    end,
    EngagementPulse = function()
    end,
    CombatPulse = function()
    end,
}

return Rotation
