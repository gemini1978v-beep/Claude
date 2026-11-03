export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'cache-warmth': { lastAt: number | null; now: number; limits: Limit[] }
  }
}
