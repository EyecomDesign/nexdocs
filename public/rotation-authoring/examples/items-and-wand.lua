local HEALTHSTONE_ITEM_IDS = { 5512, 5511, 5510, 5509 }

for _, itemID in ipairs(HEALTHSTONE_ITEM_IDS) do
    if NX.Item.GetItemCount(itemID) > 0 then
        NX.Item.UseItemByID(itemID)
        break
    end
end

-- This registers intent. Do not call spells.Shoot:Execute() here.
NX.Wand.Maintain()
