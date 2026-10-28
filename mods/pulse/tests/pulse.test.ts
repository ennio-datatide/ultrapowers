import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Pulse } from '../types'
import { fit, groups, isLoud, meter, span } from '../hooks/row'

const NOW = Date.parse('2026-10-14T12:00:00Z')
const at = (hoursAhead: number) => new Date(NOW + hoursAhead * 3_600_000).toISOString()
const QUIET: Pulse = { isBusy: false, startedAt: 0, tools: 0, failed: 0, live: [], agents: [], last: null, mods: [], refused: [] }

test('units are always named', () => {
  expect([12_000, 63_000, 9_000_000, 363_600_000].map(span)).toEqual(['12s', '1m03', '2h30m', '4d05h'])
})

test('a limit within its pace is calm, and the tick marks how much of the window has passed', () => {
  // One hour into a five-hour window, 20% used: on pace.
  expect(meter({ kind: 'five_hour', percentUsed: 20, resetsAt: at(4) }, NOW)).toEqual({ text: '5h ▰|▱▱▱▱ 20% ↻4h00m', plain: '5h limit 20% used, resets in 4h00m', level: 'calm' })
})

test('spending ahead of the pace is marked with an arrow, 90% and up with an exclamation mark', () => {
  expect(meter({ kind: 'five_hour', percentUsed: 60, resetsAt: at(4) }, NOW)).toEqual({ text: '5h ▰|▰▰▱▱ 60%↑ ↻4h00m', plain: '5h limit 60% used, over pace, resets in 4h00m', level: 'over' })
  expect(meter({ kind: 'seven_day', percentUsed: 93, resetsAt: at(12) }, NOW)?.text).toBe('7d ▰▰▰▰▰| 93%! ↻12h00m')
  expect(meter({ kind: 'spend_limit', percentUsed: 50 }, NOW)).toBe(null)
})

test('groups come in order of importance', () => {
  const busy: Pulse = { ...QUIET, isBusy: true, startedAt: NOW - 63_000, tools: 4, failed: 3, live: [{ id: 'a', tool: 'Bash', startedAt: NOW - 12_000 }], agents: [{ id: 'x', name: 'Explore' }], mods: ['pulse', 'alerts'], refused: ['shady'] }
  const usage = { contextPercent: 84, usd: 16.99, limits: [{ kind: 'five_hour', percentUsed: 20, resetsAt: at(4) }, { kind: 'seven_day', percentUsed: 95, resetsAt: at(24) }] }
  const row = groups(busy, usage, NOW)
  expect(row.map(group => group.name)).toEqual(['alerts', 'live', 'agents', 'turn', 'meters', 'cost', 'mods'])
  expect(row.map(group => group.tone)).toEqual(['error', 'claude', 'suggestion', 'warning', 'inactive', 'inactive', 'inactive'])
  expect(row[0]?.text).toBe('✗ shady off · ctx 84% · 3 failed · 7d ▰▰▰▰|▰ 95%! ↻1d00h')
  expect(row.slice(1).map(group => group.text)).toEqual(['Bash 12s', '▸ Explore', 'turn 1m03 · 4 tools · 3 failed', '5h ▰|▱▱▱▱ 20% ↻4h00m', '$16.99', '2 mods'])
})

test('nothing to say, nothing drawn: fewer than three failures and a context under 80% raise no alert', () => {
  expect(groups(QUIET, { limits: [] }, NOW)).toEqual([])
  expect(groups({ ...QUIET, failed: 2 }, { contextPercent: 79, limits: [] }, NOW)).toEqual([])
})

test('agents are named while the names fit in 24 characters, and counted past that', () => {
  const named = groups({ ...QUIET, agents: [{ id: '1', name: 'Explore' }, { id: '2', name: 'Plan' }] }, { limits: [] }, NOW)
  expect(named[0]?.text).toBe('▸ Explore, Plan')
  const many = groups({ ...QUIET, agents: [{ id: '1', name: 'general-purpose' }, { id: '2', name: 'general-purpose' }, { id: '3', name: 'Explore' }] }, { limits: [] }, NOW)
  expect(many[0]?.text).toBe('▸ 3 agents')
})

test('the row is cut from the right, and never through a group', () => {
  const list = [{ text: 'aaaa' }, { text: 'bbbb' }, { text: 'cccc' }]
  expect(fit(list, 100)).toHaveLength(3)
  expect(fit(list, 11)).toEqual([{ text: 'aaaa' }, { text: 'bbbb' }])
  expect(fit(list, 10)).toEqual([{ text: 'aaaa' }])
  expect(fit(list, 3)).toEqual([])
})

test('the plain form says it in words, with no glyphs', () => {
  const row = groups({ ...QUIET, refused: ['shady'], agents: [{ id: '1', name: 'Explore' }] }, { limits: [{ kind: 'five_hour', percentUsed: 60, resetsAt: at(4) }] }, NOW)
  const plain = row.map(group => group.plain).join(', ')
  expect(plain).toBe('shady was refused and is off, 5h limit 60% used, over pace, resets in 4h00m, agents: Explore')
  expect(/[✗▰▱↑↻▸|]/.test(plain)).toBe(false)
})

type World = { usage: { context: { window: number; percent?: number }; rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]; cost?: { usd: number } } }

/** Stands for the engine beneath the mod: a clock the test moves, the session's figures, and tools that answer. */
function world(on: On, hold?: { tool: Promise<void> }): World & { clock: ReturnType<typeof mock.clock> } {
  const state: World = { usage: { context: { window: 200_000, percent: 10 }, rateLimits: [] } }
  const clock = mock.clock(on, { now: NOW })
  on('session.usage', () => ({ value: { startedAt: NOW, ...state.usage } }))
  on('ui.render', ($$, e) => {
    // The engine's own line, when the mod passes.
    const { Text } = $$.ui.resolve(e)
    return h(Text, null, `the engine line${e.component === 'PromptHint' ? e.props.tail ?? '' : ''}`) as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('agent.spawn', () => ({ model: 'm', agentId: 'agent-1' }))
  on('plugin.register', (_$, e) => (e.name === 'shady' ? { refuse: 'no' } : { allow: true }))
  on('tool.call', async (_$, e) => {
    if (hold) await hold.tool
    return e.tool === 'Read' ? { result: 'x', isError: true } : { result: 'ok' }
  })
  return { ...state, usage: state.usage, clock }
}

const HINT = { plugin: 'pulse', component: 'PromptHint', props: { isDraft: false, isWorking: false, hint: '? for shortcuts' }, viewport: { columns: 160, rows: 40 } } as const
const START = { cwd: '/work', surface: 'terminal', isInteractive: true } as const
const turn = { answer: 'ok', isAborted: false, turnId: 't', reason: 'answer' } as const
test('a quiet session keeps the engine\'s own line and adds the figures after it, uncolored', async ($, on) => {
  world(on)
  await $.prompt.submit({ text: 'go' } as never)
  await $.tool.call({ tool: 'Bash', tool_use_id: 'a', command: 'ls' })
  await $.turn.complete({ ...turn, durationMs: 26_000 })
  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' } as never)
  expect(await ui.find({ text: 'the engine line| last 26s · 1 tool | 1 mod' })).toBeDefined()
  // On the desktop no tree is drawn at all: the same goes after the engine's line in words.
  const desktop = await $.ui.mount({ ...HINT, surface: 'desktop' } as never)
  expect(await desktop.find({ text: 'the engine linelast 26s, 1 tool, 1 mod' })).toBeDefined()
  expect(isLoud(groups({ ...QUIET, last: { ms: 1, tools: 1, failed: 0 } }, { limits: [] }, NOW), false)).toBe(false)
})

test('a running tool shows with its timer, then the turn is kept as the last turn', async ($, on) => {
  let release = () => {}
  const { clock } = world(on, { tool: new Promise<void>(resolve => (release = resolve)) })
  await $.session.start(START)
  await $.prompt.submit({ text: 'go' } as never)
  const call = $.tool.call({ tool: 'Bash', tool_use_id: 'a', command: 'sleep 12' })
  await clock.advance(12_000)
  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' } as never)
  expect(await ui.find({ text: 'Bash 12s' })).toBeDefined()
  expect(await ui.find({ text: 'turn 12s · 1 tool' })).toBeDefined()
  release()
  await call
  await $.turn.complete({ ...turn, durationMs: 26_000 })
  await clock.advance(60_000)
  expect(await ui.find({ text: 'last 26s · 1 tool' })).toBeDefined()
  expect(await ui.find({ text: 'Bash 12s' })).toBeUndefined()
})

test('three failed tools raise an alert, and each loaded mod is counted', { plugins: [{ name: 'alerts', register() {} }] }, async ($, on) => {
  world(on)
  await $.prompt.submit({ text: 'go' } as never)
  for (const id of ['a', 'b', 'c']) await $.tool.call({ tool: 'Read', tool_use_id: id, file_path: '/nope' })
  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' } as never)
  expect(await ui.find({ text: '3 failed' })).toBeDefined()
  expect(await ui.find({ text: '2 mods' })).toBeDefined()
})

test('an agent shows from its spawn until its own turn ends', async ($, on) => {
  world(on)
  await $.agent.spawn({ tool_use_id: 'a', prompt: 'look', description: 'look around', subagentType: 'Explore' } as never)
  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' } as never)
  expect(await ui.find({ text: '▸ Explore' })).toBeDefined()
  await $.turn.complete({ ...turn, durationMs: 5_000, agentId: 'agent-1' })
  expect(await ui.find({ text: '▸ Explore' })).toBeUndefined()
})

test('a narrow terminal drops whole groups from the right', { plugins: [{ name: 'alerts', register() {} }] }, async ($, on) => {
  const { usage } = world(on)
  usage.cost = { usd: 16.99 }
  await $.prompt.submit({ text: 'go' } as never)
  await $.turn.complete({ ...turn, durationMs: 26_000 })
  const wide = await $.ui.mount({ ...HINT, surface: 'terminal' } as never)
  expect(await wide.find({ text: '| last 26s · 0 tools | $16.99 | 2 mods' })).toBeDefined()
  const narrow = await $.ui.mount({ ...HINT, surface: 'terminal', viewport: { columns: 40, rows: 40 } } as never)
  expect(await narrow.find({ text: '| last 26s · 0 tools' })).toBeDefined()
  expect(await narrow.find({ text: '$16.99' })).toBeUndefined()
})

test('it redraws every second while a turn runs and once a minute when idle', async ($, on) => {
  const { clock } = world(on)
  await $.session.start(START)
  await $.prompt.submit({ text: 'go' } as never)
  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' } as never)
  await clock.advance(3_000)
  expect(await ui.find({ text: 'turn 3s' })).toBeDefined()
  await $.turn.complete({ ...turn, durationMs: 3_000 })
  await $.agent.spawn({ tool_use_id: 'a', prompt: 'p', description: 'd', subagentType: 'Explore' } as never)
  // Idle: the row waits for the minute, so a figure that moved shows only then. The agent's spawn redrew it at once.
  expect(await ui.find({ text: '▸ Explore' })).toBeDefined()
})
