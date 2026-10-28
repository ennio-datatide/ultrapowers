import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { needsYou, span } from '../hooks/register'

/** Stands for the engine beneath the mod: records each sound and notification, and answers the events raised. */
function world(on: On) {
  const sounds: string[] = []
  const notes: string[] = []
  on('audio.play', (_$, e) => {
    sounds.push(String(e.clip.asset))
    return { value: undefined }
  })
  on('ui.notify', (_$, e) => {
    notes.push(e.text)
    return { value: { isSent: true, channel: 'iterm2' } }
  })
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('classic.Notification', () => ({}))
  on('classic.StopFailure', () => ({}))
  on('tool.call', () => ({ result: 'ok' }))
  return { sounds, notes }
}

const turn = { answer: 'ok', isAborted: false, turnId: 't1' } as const

test('units are always named', () => {
  expect(span(12_000)).toBe('12s')
  expect(span(63_000)).toBe('1m03s')
  expect(span(9_000_000)).toBe('2h30m')
  expect(span(363_600_000)).toBe('4d05h')
})

test('a long turn that answered plays Glass and says how long and how many tools', async ($, on) => {
  const { sounds, notes } = world(on)
  mock.clock(on, { now: 10_000 })
  await $.tool.call({ tool: 'Bash', tool_use_id: 'a', command: 'ls' })
  await $.tool.call({ tool: 'Bash', tool_use_id: 'b', command: 'ls' })
  await $.turn.complete({ ...turn, reason: 'answer', durationMs: 95_000 })
  expect(sounds).toEqual(['sounds/Glass.aiff'])
  expect(notes).toEqual(['Done · 1m35s · 2 tools'])
})

test('a short turn and a subagent turn stay quiet', async ($, on) => {
  const { sounds } = world(on)
  mock.clock(on, { now: 10_000 })
  await $.turn.complete({ ...turn, reason: 'answer', durationMs: 5_000 })
  await $.turn.complete({ ...turn, reason: 'answer', durationMs: 95_000, agentId: 'sub' })
  expect(sounds).toEqual([])
})

test('a permission prompt pings, an idle notice does not', async ($, on) => {
  const { sounds, notes } = world(on)
  mock.clock(on, { now: 10_000 })
  await $.classic.Notification({ message: 'Claude is waiting for your input', notification_type: 'idle_prompt' })
  expect(sounds).toEqual([])
  await $.classic.Notification({ message: 'Claude needs your permission to use Bash', notification_type: 'permission_prompt' })
  expect(sounds).toEqual(['sounds/Ping.aiff'])
  expect(notes).toEqual(['Needs your OK'])
  expect(needsYou('elicitation_dialog', '')).toBe(true)
})

test('an error plays Basso, and alerts are at most one every three seconds', async ($, on) => {
  const { sounds, notes } = world(on)
  const clock = mock.clock(on, { now: 10_000 })
  await $.turn.complete({ ...turn, reason: 'error', durationMs: 1_000 })
  await $.classic.StopFailure({ error: 'rate_limit' })
  expect(sounds).toEqual(['sounds/Basso.aiff'])
  await clock.advance(3_000)
  await $.classic.StopFailure({ error: 'rate_limit' })
  expect(sounds).toEqual(['sounds/Basso.aiff', 'sounds/Basso.aiff'])
  expect(notes[1]).toBe('Error: rate limit')
})
