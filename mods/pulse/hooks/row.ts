// The row, as plain functions of the figures: what each group says, in which order, and which fit.
import type { Pulse } from '../types'

/** A length of time with its units always named: 12s, 1m03, 2h30m, 4d05h. */
export function span(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  const two = (n: number) => String(n).padStart(2, '0')
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${two(seconds % 60)}`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h${two(Math.floor((seconds % 3600) / 60))}m`
  return `${Math.floor(seconds / 86_400)}d${two(Math.floor((seconds % 86_400) / 3600))}h`
}

/** One rate-limit window as the engine reports it. */
export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Usage = { contextPercent?: number; limits: Limit[]; usd?: number }

const WINDOWS: Record<string, { label: string; ms: number }> = {
  five_hour: { label: '5h', ms: 5 * 3_600_000 },
  seven_day: { label: '7d', ms: 7 * 86_400_000 },
}
const CELLS = 5
/** How far past the pace a window has to be before it is called overspent, in points. */
const SLACK = 5

export type Meter = { text: string; plain: string; level: 'calm' | 'over' | 'high' }

/**
 * A limit drawn against its pace: filled cells for what is used, a tick where the window's time stands.
 * Used ahead of the tick is overspending (an arrow); 90% or more is high (an exclamation mark).
 */
export function meter(limit: Limit, now: number): Meter | null {
  const window = WINDOWS[limit.kind]
  if (!window) return null
  const used = Math.round(limit.percentUsed)
  const resets = limit.resetsAt === undefined ? Number.NaN : Date.parse(limit.resetsAt)
  const left = Number.isNaN(resets) ? null : Math.max(0, resets - now)
  const elapsed = left === null ? null : Math.min(1, Math.max(0, 1 - left / window.ms))
  const level = used >= 90 ? 'high' : elapsed !== null && used > elapsed * 100 + SLACK ? 'over' : 'calm'
  const filled = Math.min(CELLS, Math.round((used / 100) * CELLS))
  const cells: string[] = Array.from({ length: CELLS }, (_, i) => (i < filled ? '▰' : '▱'))
  if (elapsed !== null) cells.splice(Math.round(elapsed * CELLS), 0, '|')
  const mark = level === 'high' ? '!' : level === 'over' ? '↑' : ''
  const reset = left === null ? '' : ` ↻${span(left)}`
  const words = level === 'high' ? ', nearly used up' : level === 'over' ? ', over pace' : ''
  return {
    text: `${window.label} ${cells.join('')} ${used}%${mark}${reset}`,
    plain: `${window.label} limit ${used}% used${words}${left === null ? '' : `, resets in ${span(left)}`}`,
    level,
  }
}

/** A theme color key, so the row follows the person's theme. */
export type Tone = 'error' | 'claude' | 'suggestion' | 'warning' | 'inactive'
/** One group of the row: drawn whole or not at all. `plain` says the same in words, for where glyphs are not drawn. */
export type Group = { name: string; tone: Tone; text: string; plain: string }

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
/** Names are shown while they fit in this many characters; past it, a count. */
export const NAMES_ROOM = 24

/** The groups of the row, most important first. */
export function groups(pulse: Pulse, usage: Usage, now: number): Group[] {
  const out: Group[] = []
  const meters = usage.limits.map(limit => meter(limit, now)).filter((one): one is Meter => one !== null)
  const urgent = meters.filter(one => one.level !== 'calm')

  const alerts: { text: string; plain: string }[] = [
    ...pulse.refused.map(name => ({ text: `✗ ${name} off`, plain: `${name} was refused and is off` })),
    ...((usage.contextPercent ?? 0) >= 80 ? [{ text: `ctx ${usage.contextPercent}%`, plain: `context ${usage.contextPercent}% full` }] : []),
    ...(pulse.failed >= 3 ? [{ text: `${pulse.failed} failed`, plain: `${count(pulse.failed, 'tool')} failed` }] : []),
    ...urgent,
  ]
  if (alerts.length) out.push({ name: 'alerts', tone: 'error', text: alerts.map(one => one.text).join(' · '), plain: alerts.map(one => one.plain).join(', ') })

  const live = pulse.live.at(-1)
  if (live) out.push({ name: 'live', tone: 'claude', text: `${live.tool} ${span(now - live.startedAt)}`, plain: `${live.tool} running for ${span(now - live.startedAt)}` })

  if (pulse.agents.length) {
    const names = pulse.agents.map(agent => agent.name).join(', ')
    const text = names.length <= NAMES_ROOM ? names : count(pulse.agents.length, 'agent')
    out.push({ name: 'agents', tone: 'suggestion', text: `▸ ${text}`, plain: `agents: ${text}` })
  }

  const turn = pulse.isBusy ? { ms: now - pulse.startedAt, tools: pulse.tools, failed: pulse.failed } : pulse.last
  if (turn) {
    const label = pulse.isBusy ? 'turn' : 'last'
    const parts = [`${label} ${span(turn.ms)}`, count(turn.tools, 'tool'), ...(turn.failed ? [`${turn.failed} failed`] : [])]
    out.push({ name: 'turn', tone: 'warning', text: parts.join(' · '), plain: parts.join(', ') })
  }

  const calm = meters.filter(one => one.level === 'calm')
  if (calm.length) out.push({ name: 'meters', tone: 'inactive', text: calm.map(one => one.text).join('  '), plain: calm.map(one => one.plain).join(', ') })

  if (usage.usd !== undefined) out.push({ name: 'cost', tone: 'inactive', text: `$${usage.usd.toFixed(2)}`, plain: `cost $${usage.usd.toFixed(2)}` })
  if (pulse.mods.length) out.push({ name: 'mods', tone: 'inactive', text: count(pulse.mods.length, 'mod'), plain: count(pulse.mods.length, 'mod') })
  return out
}

export const SEPARATOR = ' | '

/**
 * Whether the row has something that needs color: an alert, a tool running, agents out, a turn under way.
 * A row with none of these is only for reference, and is said quietly after the engine's own line.
 */
export function isLoud(list: Group[], isBusy: boolean): boolean {
  return list.some(group => group.name === 'alerts' || group.name === 'live' || group.name === 'agents' || (group.name === 'turn' && isBusy))
}

/** The groups that fit in `room` characters, in order: the row is cut from the right, and never through a group. */
export function fit<G extends { text: string }>(list: G[], room: number): G[] {
  const kept: G[] = []
  let used = 0
  for (const group of list) {
    const width = group.text.length + (kept.length ? SEPARATOR.length : 0)
    if (used + width > room) break
    kept.push(group)
    used += width
  }
  return kept
}
