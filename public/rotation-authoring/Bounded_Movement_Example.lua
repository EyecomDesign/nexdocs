---@type NX
local NX = ...

-- ============================================================
-- Spell definitions
-- ============================================================
local spells = NX.SpellBook:GetGlobal()

local Corruption   = spells.Corruption
local CurseOfAgony = spells.CurseOfAgony
local ShadowBolt   = spells.ShadowBolt

-- ============================================================
-- Constants
-- ============================================================
local DISTANCES = { 8, 12, 16 }
local ANGLES = { 0, 30, -30, 60, -60, 90, -90 }
local REQUEST_SECONDS, ROUTE_SECONDS, TOTAL_SECONDS = 5, 8, 20
local PULSE_LEASE, ARRIVAL_RANGE = 0.5, 1.5

-- ============================================================
-- State
-- ============================================================
-- Movement ownership is global: cancel and observe cleanup before replacing.
local generation, latched, pulseAt = 0, false, GetTime()
local current, inFlight, watchdog

-- ============================================================
-- Unit definitions
-- ============================================================
local Player = NX.UnitManager.Get("player")
local Target = NX.UnitManager.Get("target")

-- ============================================================
-- Shared functions
-- ============================================================
local function Finite(value)
    return type(value) == "number" and value == value and math.abs(value) < math.huge
end

local function Position(unit)
    if not unit or not unit:IsValid() then return end
    local x, y, z = unit:GetPosition()
    if Finite(x) and Finite(y) and Finite(z) then return { x = x, y = y, z = z } end
end

local function DistanceSquared(a, b)
    return (a.x - b.x)^2 + (a.y - b.y)^2 + (a.z - b.z)^2
end

local function Context()
    local player, target = Player, Target
    if not player or not player:IsValid() or player:IsDeadOrGhost()
        or not target or not target:IsValid() or not target:IsEnemy() or target:IsDead()
    then return end
    local from, threat, guid = Position(player), Position(target), target:GUID()
    if from and threat and guid then return { from = from, threat = threat, guid = guid } end
end

local function Candidates(context)
    local from, threat = context.from, context.threat
    local dx, dy = from.x - threat.x, from.y - threat.y
    local length = math.sqrt(dx * dx + dy * dy)
    if length < 0.01 then return {} end
    dx, dy = dx / length, dy / length
    local points = {}
    for _, distance in ipairs(DISTANCES) do
        for _, degrees in ipairs(ANGLES) do
            local angle = math.rad(degrees)
            local x = dx * math.cos(angle) - dy * math.sin(angle)
            local y = dx * math.sin(angle) + dy * math.cos(angle)
            points[#points + 1] = {
                x = from.x + x * distance, y = from.y + y * distance, z = from.z,
            }
        end
    end
    return points -- At most 21 same-height candidates, not proof of walkability.
end

local function Finish(reason)
    local run = current
    if not run then return end
    current = nil
    generation = generation + 1 -- Invalidate before stopping keys or navigation.
    if not NX.Toggles["Retreat"] then latched = false end
    if watchdog then watchdog:Cancel(); watchdog = nil end
    NX.Movement.StopMovement()
    NX.Movement.SetRotationMovementOverride(false)
    NX.Movement.ResumeNavigation()
    if reason == "complete" then
        local context = Context()
        if context then
            local p = context.threat
            NX.Movement.FaceToPosition(p.x, p.y, p.z, false)
        end
    end
    print("Bounded movement: " .. reason .. (run.detail and " (" .. run.detail .. ")" or ""))
    -- inFlight stays occupied until its callback settles. There is no public
    -- CancelRequest, so cancellation must not start an overlapping router request.
end

local function Check(now)
    local run = current
    if not run then return end
    if now - pulseAt > PULSE_LEASE then Finish("pulse-gap"); return end
    if not NX.Toggles["Retreat"] then Finish("cancelled"); return end
    local context = Context()
    if not context then Finish("target-or-player-lost"); return end
    if context.guid ~= run.guid then Finish("target-changed"); return end
    if DistanceSquared(context.threat, run.threat) > 6^2 then Finish("target-moved"); return end
    if now >= run.started + TOTAL_SECONDS then Finish("total-timeout"); return end
    if run.phase == "pending" then
        if now >= run.deadline then Finish("request-timeout"); return end
        if DistanceSquared(context.from, run.from) > 2^2 then Finish("origin-moved"); return end
    elseif run.phase == "following" then
        if DistanceSquared(context.from, run.goal) <= ARRIVAL_RANGE^2 then
            Finish("complete"); return
        end
        if now >= run.deadline then Finish("route-timeout"); return end
    end
    return context
end

local function RequestNext(run, context, now)
    if inFlight then return end
    local goal = run.candidates[run.next]
    if not goal then Finish("exhausted"); return end
    run.next = run.next + 1
    run.phase, run.deadline, run.from = "pending", now + REQUEST_SECONDS, context.from
    local ticket = { generation = generation }
    run.ticket, run.reply, inFlight = ticket, nil, ticket
    -- Install ticket/state BEFORE RequestPath: cache/invalid-input callbacks can
    -- run inline. The callback only fills the inbox; a live pulse installs paths.
    ticket.id = NX.Movement.RequestPath(goal.x, goal.y, goal.z, function(result)
        if inFlight == ticket then inFlight = nil end
        if current == run and generation == ticket.generation and run.ticket == ticket then
            run.reply = result or { ok = false, reason = "missing-result" }
        end
    end, { allowPartialAsProgress = false })
end

local function TickRetreat(allowStart)
    local now = GetTime()
    -- Test the old lease before renewing it, including on resume after a pause.
    if current and now - pulseAt > PULSE_LEASE then Finish("pulse-gap") end
    pulseAt = now
    if not NX.Toggles["Retreat"] then latched = false end
    if not current and allowStart and NX.Toggles["Retreat"] and not latched and not inFlight then
        local context = Context()
        if not context then return end
        latched = true
        if not (C_Timer and C_Timer.NewTicker) then
            print("Bounded movement: timer-unavailable")
            return
        end
        generation = generation + 1
        current = {
            guid = context.guid, threat = context.threat, candidates = Candidates(context),
            next = 1, phase = "ready", started = now,
        }
        NX.Movement.StopMovement()
        NX.Movement.SetRotationMovementOverride(true)
        watchdog = C_Timer.NewTicker(0.1, function() Check(GetTime()) end)
    end
    local run, context = current, Check(now)
    if not run or not context then return end
    if run.phase == "ready" then
        RequestNext(run, context, now)
        return
    end
    if run.phase ~= "pending" or run.reply == nil then return end
    local result = run.reply
    run.reply = nil
    run.detail = tostring(result.reason or "result") .. ", status=" .. tostring(result.status)
    if result.requestId == run.ticket.id and result.ok == true
        and result.isComplete ~= false and Finite(result.mapId)
        and type(result.path) == "table" and #result.path > 0
    then
        local accepted, reason = NX.Movement.FollowPath(result.path, "backward", result.mapId)
        if accepted then
            run.phase, run.goal, run.deadline = "following", result.path[#result.path], now + ROUTE_SECONDS
            return
        end
        run.detail = "follow-rejected: " .. tostring(reason)
    end
    run.phase = "ready" -- Try the next candidate on another pulse, never recurse.
end

-- ============================================================
-- Spell conditions
-- ============================================================
Corruption:CastableIf(function()
    return NX.Toggles["Damage"] and not Target:HasMyDebuff(Corruption)
end):SetTarget(Target)

CurseOfAgony:CastableIf(function()
    return NX.Toggles["Damage"] and not Target:HasMyDebuff(CurseOfAgony)
end):SetTarget(Target)

ShadowBolt:CastableIf(function()
    return NX.Toggles["Damage"]
end):SetTarget(Target)

-- ============================================================
-- Rotation
-- ============================================================
local Rotation = {
    Toggles = {
        ["Damage"] = { Description = "Use damage priorities", Default = true },
        ["Retreat"] = { Description = "Try one retreat; off cancels and rearms", Default = false },
    },
    Options = {},
    OutOfCombatPulse = function()
        TickRetreat(false)
        return false
    end,
    EngagementPulse = function()
        TickRetreat(true)

        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
        if ShadowBolt:Execute() then return true end
    end,
    CombatPulse = function()
        NX.Wand.Maintain()

        TickRetreat(true)

        if Corruption:Execute() then return true end
        if CurseOfAgony:Execute() then return true end
        if ShadowBolt:Execute() then return true end
    end,
}

return Rotation
