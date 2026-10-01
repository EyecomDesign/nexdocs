local function OutOfCombatPetWork()
    return NX.Pet.Maintain()
end

local function CombatPetWork()
    return NX.Pet.Assist()
end

return OutOfCombatPetWork, CombatPetWork
