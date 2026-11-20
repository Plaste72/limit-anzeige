import { expect, test } from 'claude-code/testing'

const JETZT = Date.parse('2026-11-20T12:00:00Z')
const BAND = (surface: 'terminal' | 'desktop') => ({
  plugin: 'limit-anzeige',
  component: 'AbovePrompt',
  surface,
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 3, bodyColumns: 120 },
}) as const

test('beim Start ohne frische Werte: letzte Werte grau', async ($, on) => {
  on('clock.now', () => ({ value: JETZT }))
  on('session.usage', () => ({ value: { startedAt: JETZT, context: {}, rateLimits: [] } }))
  on('store.get', () => ({
    value: {
      zeit: JETZT - 3600000,
      fenster: [
        { kind: 'five_hour', percentUsed: 40, resetsAt: '2026-11-20T11:30:00Z' },
        { kind: 'seven_day', percentUsed: 25, resetsAt: '2026-11-23T08:00:00Z' },
      ],
    },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount(BAND(surface))
    expect((await ui.find({ type: 'Text', text: /zuletzt/ }))?.text).toBeTruthy()
    expect((await ui.find({ type: 'Text', text: /wieder frei/ }))?.text).toBeTruthy()
    expect((await ui.find({ type: 'Text', text: /25 %/ }))?.text).toBeTruthy()
    await ui.unmount()
  }
})

test('nach einer Antwort: frische Werte, nicht grau', async ($, on) => {
  let gespeichert: unknown
  on('clock.now', () => ({ value: JETZT }))
  on('store.set', (_, e) => { gespeichert = e.value; return { value: undefined } })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.measure({ rateLimits: [{ kind: 'five_hour', percentUsed: 98, resetsAt: '2026-11-20T13:00:00Z' }], changed: ['rateLimits'] } as any)

  const ui = await $.ui.mount(BAND('desktop'))
  expect(await ui.find({ type: 'Text', text: /zuletzt/ })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /FAST AUFGEBRAUCHT/ }))?.text).toBeTruthy()
  await ui.unmount()
  expect(gespeichert).toBeTruthy()
})
