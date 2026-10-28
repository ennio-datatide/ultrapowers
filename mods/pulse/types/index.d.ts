/** A tool call that has started and not yet answered. */
export type Live = { id: string; tool: string; startedAt: number }

/** A turn's figures: how long it took and what its tools did. */
export type TurnFigures = { ms: number; tools: number; failed: number }

/** Everything the row is drawn from that the mod itself keeps count of. */
export type Pulse = {
  isBusy: boolean
  startedAt: number
  tools: number
  failed: number
  live: Live[]
  /** Running subagents, by id, with the name shown for each. */
  agents: { id: string; name: string }[]
  last: TurnFigures | null
  /** Mods the engine loaded, and mods another mod refused. */
  mods: string[]
  refused: string[]
}

declare module 'claude-code' {
  interface PluginState {
    pulse: { pulse: Pulse; beat: number }
  }
}
