---@type NX
local NX = ...

-- Warlock TBC demonstration. Retreat is opt-in and runs once per toggle-on.
-- Turn Retreat off and wait for cleanup before replacing this rotation.
local DISTANCES = { 8, 12, 16 }
local ANGLES = { 0, 30, -30, 60, -60, 90, -90 }
local REQUEST_SECONDS, ROUTE_SECONDS, TOTAL_SECONDS = 5, 8, 20
local PULSE_LEASE, ARRIVAL_RANGE = 0.5, 1.5
local generation, latched, pulseAt = 0, false, GetTime()
local current, inFlight, watchdog

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
    local player = NX.UnitManager.Get("player")
    local target = NX.UnitManager.Get("target")
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
    if NX.Toggles["Retreat"] ~= true then latched = false end
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
    if NX.Toggles["Retreat"] ~= true then Finish("cancelled"); return end
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
    if NX.Toggles["Retreat"] ~= true then latched = false end
    if not current and allowStart and NX.Toggles["Retreat"] == true and not latched and not inFlight then
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

-- A real, small combat priority continues while the request is pending/active.
local spells = NX.SpellBook:GetGlobal()
local Corruption, CurseOfAgony, ShadowBolt = spells.Corruption, spells.CurseOfAgony, spells.ShadowBolt
local function Target() return NX.UnitManager.Get("target") end
for _, spell in pairs({ Corruption, CurseOfAgony }) do
    spell:CastableIf(function()
        local target = Target()
        return NX.Toggles["Damage"] and target and not target:HasMyDebuff(spell)
    end):SetTarget(Target)
end
if ShadowBolt then
    ShadowBolt:CastableIf(function() return NX.Toggles["Damage"] end):SetTarget(Target)
end
local function CombatPulse()
    TickRetreat(true) -- Never return early just because movement is pending.
    if Corruption and Corruption:Execute() then return end
    if CurseOfAgony and CurseOfAgony:Execute() then return end
    if ShadowBolt and ShadowBolt:Execute() then return end
end

return {
    Toggles = {
        ["Damage"] = { Description = "Use the small Warlock damage priority", Default = true },
        ["Retreat"] = { Description = "Try one bounded retreat; off cancels and rearms", Default = false },
    },
    Options = {},
    OutOfCombatPulse = function() TickRetreat(false); return false end,
    EngagementPulse = CombatPulse,
    CombatPulse = CombatPulse,
}
