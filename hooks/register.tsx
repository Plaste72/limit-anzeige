import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Fenster, Stand } from '../types'

const fenster = atom({ plugin: 'limit-anzeige', key: 'fenster' } as const, [] as Fenster[])
const stand = atom({ plugin: 'limit-anzeige', key: 'stand' } as const, { alt: false, zeit: 0 } as Stand)

// Dauerhafter Speicher (bleibt zwischen Chats): letzte bekannte Werte
const SPEICHER = 'letzte'
type Gespeichert = { fenster: Fenster[]; zeit: number }

function uhrzeit(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const NAMEN: Record<string, string> = {
  five_hour: '5 Std',
  seven_day: 'Woche',
}

function restzeit(resetsAt: string | undefined, jetzt: number): string {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - jetzt
  if (!(ms > 0)) return ' · gleich neu'
  const min = Math.round(ms / 60000)
  const tage = Math.floor(min / 1440)
  const std = Math.floor((min % 1440) / 60)
  const rest = min % 60
  if (tage > 0) return ` · neu in ${tage} T ${std} h`
  if (std > 0) return ` · neu in ${std}:${String(rest).padStart(2, '0')} h`
  return ` · neu in ${rest} Min`
}

// Balkenbreite passt sich dem Platz an: mindestens 10, höchstens 25 Zeichen
function breiteFuer(spalten: number | undefined): number {
  if (!spalten || !(spalten > 0)) return 20
  return Math.max(10, Math.min(25, Math.floor((spalten - 60) / 2)))
}

function farbeFuer(prozent: number): string {
  if (prozent >= 90) return 'error'
  if (prozent >= 70) return 'warning'
  return 'success'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    try {
      const usage = await $.session.usage()
      if (usage.rateLimits.length > 0) {
        const jetzt = await $.clock.now()
        await update($, fenster, () => usage.rateLimits.map(r => ({ ...r })))
        await update($, stand, () => ({ alt: false, zeit: jetzt }))
        await $.store.set(SPEICHER, { fenster: usage.rateLimits.map(r => ({ ...r })), zeit: jetzt })
      } else {
        // Noch keine frischen Werte: letzte bekannte Werte grau zeigen
        const g = (await $.store.get(SPEICHER)) as Gespeichert | undefined
        if (g && Array.isArray(g.fenster) && g.fenster.length > 0) {
          await update($, fenster, () => g.fenster)
          await update($, stand, () => ({ alt: true, zeit: g.zeit }))
        }
      }
    } catch {}
    return result
  })

  on('session.measure', async ($, e, next) => {
    const jetzt = await $.clock.now()
    const neu = e.rateLimits.map(r => ({ ...r }))
    await update($, fenster, () => neu)
    await update($, stand, () => ({ alt: false, zeit: jetzt }))
    try {
      if (neu.length > 0) await $.store.set(SPEICHER, { fenster: neu, zeit: jetzt })
    } catch {}
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const liste = await read($, fenster)
    const st = await read($, stand)
    const { Box, Text } = $.ui.resolve(e)
    const jetzt = await $.clock.now()

    if (liste.length === 0) {
      return (
        <Box>
          <Text dimColor>Nutzungslimit: noch keine Angabe (erscheint nach der ersten Antwort)</Text>
        </Box>
      )
    }

    const sortiert = [...liste].sort((a, b) => (a.kind === 'five_hour' ? -1 : b.kind === 'five_hour' ? 1 : 0))

    // Alte Werte: grau. Ist ein Fenster seitdem schon zurückgesetzt, zählt es als frei.
    const istAlt = st.alt
    const BREITE = breiteFuer(e.props.bodyColumns)

    return (
      <Box justifyContent="center">
        <Text>
          {istAlt ? <Text dimColor>{`zuletzt ${uhrzeit(st.zeit)}: `}</Text> : null}
          {sortiert.map((f, i) => {
            const abgelaufen = istAlt && !!f.resetsAt && Date.parse(f.resetsAt) <= jetzt
            const used = abgelaufen ? 0 : Math.max(0, Math.min(100, Math.round(f.percentUsed)))
            const voll = Math.round((used / 100) * BREITE)
            const name = NAMEN[f.kind] ?? f.kind
            const farbe = istAlt ? 'inactive' : farbeFuer(used)
            const zusatz = abgelaufen ? ' · wieder frei' : f.kind === 'seven_day' ? '' : restzeit(f.resetsAt, jetzt)
            return (
              <Text key={f.kind}>
                {i > 0 ? <Text color="subtle">{'    │    '}</Text> : null}
                <Text bold={!istAlt} dimColor={istAlt}>{`${name} `}</Text>
                <Text color={istAlt ? 'text' : farbe} dimColor={istAlt}>{'█'.repeat(voll)}</Text>
                <Text color="subtle">{'░'.repeat(BREITE - voll)}</Text>
                <Text color={farbe} bold={!istAlt}>{` ${used} %`}</Text>
                <Text dimColor>{zusatz}</Text>
                {!istAlt && used >= 97 ? <Text color="error" bold>{' ⚠️ FAST AUFGEBRAUCHT!'}</Text> : null}
              </Text>
            )
          })}
        </Text>
      </Box>
    )
  })
}
