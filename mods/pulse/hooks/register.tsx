import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Pulse } from '../types'
import { fit, groups, isLoud, SEPARATOR } from './row'
import type { Usage } from './row'

const EMPTY: Pulse = { isBusy: false, startedAt: 0, tools: 0, failed: 0, live: [], agents: [], last: null, mods: [], refused: [] }
const pulse = atom({ plugin: 'pulse', key: 'pulse' } as const, EMPTY)
/** When the row was last asked to redraw. A drawing reads it, so writing it draws the row again. */
const beat = atom({ plugin: 'pulse', key: 'beat' } as const, 0)

const SECOND = 1000
const IDLE_EVERY_MS = 60_000

/** Redraws every second while a turn runs, and once a minute while nothing does. */
async function tick($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const { isBusy } = await read($, pulse)
  if (isBusy || now - (await read($, beat)) >= IDLE_EVERY_MS) await update($, beat, () => now)
}

async function usageNow($: EngineInterface): Promise<Usage> {
  try {
    const usage = await $.session.usage()
    return { contextPercent: usage.context.percent, limits: usage.rateLimits, usd: usage.cost?.usd }
  }
  catch {
    return { limits: [] }
  }
}

export const register: Register = on => {
  // Every hook here only watches. When one fails, the engine goes on as if it were not there.
  on('session.start', async ($, e, next) => {
    $.clock.every(SECOND, () => void tick($).catch(() => {}))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('plugin.register', async ($, e, next) => {
    const answer = await next(e)
    const key = answer.refuse === undefined ? 'mods' : 'refused'
    await update($, pulse, now => (now[key].includes(e.name) ? now : { ...now, [key]: [...now[key], e.name] }))
    return answer
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    const startedAt = await $.clock.now()
    await update($, pulse, now => ({ ...now, isBusy: true, startedAt, tools: 0, failed: 0 }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const startedAt = await $.clock.now()
    await update($, pulse, now => ({ ...now, tools: now.tools + 1, live: [...now.live, { id: e.tool_use_id, tool: String(e.tool), startedAt }] }))
    let hasFailed = true
    try {
      const ran = await next(e)
      hasFailed = ran.deny !== undefined || ran.isError === true
      return ran
    }
    finally {
      await update($, pulse, now => ({ ...now, failed: now.failed + (hasFailed ? 1 : 0), live: now.live.filter(one => one.id !== e.tool_use_id) }))
    }
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    const id = spawned.agentId
    if (id !== undefined) await update($, pulse, now => ({ ...now, agents: [...now.agents, { id, name: e.subagentType }] }))
    return spawned
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    // A subagent's turn ending is that agent finishing; the main loop's is the person's turn.
    if (e.agentId !== undefined) await update($, pulse, now => ({ ...now, agents: now.agents.filter(agent => agent.id !== e.agentId) }))
    else await update($, pulse, now => ({ ...now, isBusy: false, live: [], last: { ms: e.durationMs, tools: now.tools, failed: now.failed } }))
    return done
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    await read($, beat)
    const now = await $.clock.now()
    const figures = await read($, pulse)
    // This mod never sees its own registration, so it counts itself.
    const mods = figures.mods.includes($.plugin.name) ? figures.mods : [$.plugin.name, ...figures.mods]
    const all = groups({ ...figures, mods }, await usageNow($), now)
    if (all.length === 0) return next(e)
    const room = (e.viewport?.columns ?? 120) - e.props.hint.length - SEPARATOR.length
    // Where the row cannot be drawn as a tree, the same is said in words after the engine's own line.
    if (e.surface !== 'terminal') {
      const words = all.map(group => ({ ...group, text: group.plain }))
      return next({ ...e, props: { ...e.props, tail: fit(words, room).map(group => group.text).join(', ') } })
    }
    const shown = fit(all, room)
    if (shown.length === 0) return next(e)
    // With nothing urgent, the engine's line stays as it is, its mode and its controls live, and the
    // figures follow it quietly. Color is kept for when there is something to look at.
    if (!isLoud(shown, figures.isBusy))
      return next({ ...e, props: { ...e.props, tail: `${SEPARATOR.trimStart()}${shown.map(group => group.text).join(SEPARATOR)}` } })
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text dimColor>{e.props.hint}</Text>
        {shown.map(group => (
          <Text>
            <Text dimColor>{SEPARATOR}</Text>
            <Text color={group.tone}>{group.text}</Text>
          </Text>
        ))}
      </Box>
    )
  })
}
