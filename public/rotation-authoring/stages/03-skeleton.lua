---@type RotationEnv
local NX = ...

-- The first loadable checkpoint: all required pulses, no policy yet.
return {
    OutOfCombatPulse = function()
        return false
    end,
    EngagementPulse = function()
        return false
    end,
    CombatPulse = function()
        return false
    end,
}
