local target = NX.UnitManager.Get("target")

Corruption:SetTarget(function()
    return NX.UnitManager.Get("target")
end)

local selected = {}
NX.UnitManager.EnumActiveEnemies(function(enemy)
    if enemy:IsEnemy() then
        selected[#selected + 1] = enemy
    end
    return #selected >= 3
end)

return target, selected
