import type { EngineInterface, Register } from 'claude-code'

/** A turn shorter than this ends quietly. */
export const LONG_TURN_MS = 30_000
/** At most one alert in this long, so a burst of events is one sound. */
export const GAP_MS = 3_000

/** A length of time with its units always named: 12s, 1m03s, 2h30m, 4d05h. */
export function span(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  const two = (n: number) => String(n).padStart(2, '0')
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${two(seconds % 60)}s`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h${two(Math.floor((seconds % 3600) / 60))}m`
  return `${Math.floor(seconds / 86_400)}d${two(Math.floor((seconds % 86_400) / 3600))}h`
}

/** Whether a notification is Claude waiting on the person: a permission prompt, a question, a plan to approve. */
export function needsYou(type: string, message: string): boolean {
  if (/idle/i.test(type)) return false
  return /permission|elicitation|question|plan/i.test(type) || /permission|approv|needs your|question|plan/i.test(message)
}

type Sound = 'Glass' | 'Ping' | 'Basso'

/** When the last alert went out. The module's own: a reload starts it over, which only allows one alert sooner. */
const last = { at: Number.NEGATIVE_INFINITY }

async function alert($: EngineInterface, sound: Sound, text: string): Promise<void> {
  const now = await $.clock.now()
  if (now - last.at < GAP_MS) return
  last.at = now
  // Either can be unavailable (no player, notifications off); the other still goes out.
  await Promise.allSettled([$.audio.play({ asset: `sounds/${sound}.aiff` }), $.ui.notify(text, { title: 'Claude Code' })])
}

export const register: Register = on => {
  let tools = 0

  // Hooks here only observe: when one fails, the engine goes on as if it were not there.
  on('tool.call', ($, e, next) => {
    tools += 1
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    // A subagent's turn is not the person's turn.
    if (e.agentId !== undefined) return done
    const used = tools
    tools = 0
    if (e.reason === 'error') await alert($, 'Basso', 'Error: the turn ended on an API error')
    else if (e.reason === 'refusal') await alert($, 'Basso', 'Error: the model refused')
    else if (e.reason === 'answer' && e.durationMs >= LONG_TURN_MS)
      await alert($, 'Glass', `Done · ${span(e.durationMs)} · ${used} ${used === 1 ? 'tool' : 'tools'}`)
    return done
  }).catch(($, e, next) => next(e))

  on('classic.Notification', async ($, e, next) => {
    const answered = await next(e)
    if (needsYou(e.notification_type, e.message)) await alert($, 'Ping', 'Needs your OK')
    return answered
  }).catch(($, e, next) => next(e))

  on('classic.StopFailure', async ($, e, next) => {
    const answered = await next(e)
    await alert($, 'Basso', `Error: ${String(e.error).replaceAll('_', ' ')}`)
    return answered
  }).catch(($, e, next) => next(e))
}
