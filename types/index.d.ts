export type Fenster = { kind: string; percentUsed: number; resetsAt?: string }

/** alt: true = letzte bekannte Werte aus einem früheren Chat; zeit = wann gemessen (ms) */
export type Stand = { alt: boolean; zeit: number }

declare module 'claude-code' {
  interface PluginState {
    'limit-anzeige': { fenster: Fenster[]; stand: Stand }
  }
}
