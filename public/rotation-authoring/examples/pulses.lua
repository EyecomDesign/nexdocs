local Rotation = {
    OutOfCombatPulse = function()
        if NX.Pet.Maintain() then
            return true
        end
        return false
    end,

    EngagementPulse = function()
        return false
    end,

    CombatPulse = function()
        NX.Wand.Maintain()
        return false
    end,
}

return Rotation
