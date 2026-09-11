local Rotation = {
    Toggles = {
        ["Damage"] = { Description = "Use damage priorities", Default = true },
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
}

return Rotation
