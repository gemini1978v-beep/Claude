import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit } from '../types'

const TTL_MIN = 60
const WIDTH = 10

// Time of the last model activity (cache write/read), a ticking "now" that redraws the band,
// and the account's rate-limit windows (five_hour, seven_day) as the last response reported them.
const lastAt = atom({ plugin: 'cache-warmth', key: 'lastAt' } as const, null)
const now = atom({ plugin: 'cache-warmth', key: 'now' } as const, 0)
const limits = atom({ plugin: 'cache-warmth', key: 'limits' } as const, [] as Limit[])

async function touch($: EngineInterface) {
  const t = await $.clock.now()
  await update($, lastAt, () => t)
  await update($, now, () => t)
}

function bar(fraction: number) {
  const filled = Math.max(0, Math.min(WIDTH, Math.round(fraction * WIDTH)))
  return '█'.repeat(filled) + '░'.repeat(WIDTH - filled)
}

function until(iso: string | undefined, t: number) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.parse(iso) - t) / 60_000))
  if (mins >= 24 * 60) return ` ↻${Math.floor(mins / 1440)}д${Math.floor((mins % 1440) / 60)}ч`
  if (mins >= 60) return ` ↻${Math.floor(mins / 60)}ч${mins % 60}м`
  return ` ↻${mins}м`
}

function usedColor(p: number) {
  return p >= 90 ? 'error' : p >= 70 ? 'warning' : 'success'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const t = await $.clock.now()
    await update($, now, () => t)
    const usage = await $.session.usage()
    await update($, limits, () => usage.rateLimits.map(l => ({ ...l })))
    $.clock.every(30_000, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
    })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, limits, () => e.rateLimits.map(l => ({ ...l })))
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await touch($).catch(() => {})
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await touch($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const last = await read($, lastAt)
    const t = await read($, now)

    let cache
    if (e.props.isWorking) {
      cache = <Text color="success">Кэш {bar(1)} греется</Text>
    } else if (last === null) {
      cache = <Text dimColor>Кэш {bar(0)} не прогрет</Text>
    } else {
      const mins = Math.max(0, Math.floor((t - last) / 60_000))
      const left = TTL_MIN - mins
      cache =
        left <= 0 ? (
          <Text color="error">Кэш {bar(0)} остыл ({mins}м)</Text>
        ) : (
          <Text color={left > 20 ? 'success' : left > 5 ? 'warning' : 'error'}>
            Кэш {bar(left / TTL_MIN)} {left}м
          </Text>
        )
    }

    const windows = (await read($, limits))
      .filter(l => l.kind === 'five_hour' || l.kind === 'seven_day')
      .sort((a, b) => (a.kind === 'five_hour' ? -1 : b.kind === 'five_hour' ? 1 : 0))

    return (
      <Box>
        {cache}
        {windows.map(l => (
          <Text key={l.kind} color={usedColor(l.percentUsed)}>
            {'  '}
            {l.kind === 'five_hour' ? '5ч' : 'Нед'} {bar(l.percentUsed / 100)} {Math.round(l.percentUsed)}%
            {until(l.resetsAt, t)}
          </Text>
        ))}
        {windows.length === 0 ? <Text dimColor>{'  '}лимиты: ждём первый ответ</Text> : null}
      </Box>
    )
  })
}
