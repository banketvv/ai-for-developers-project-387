import { describe, expect, it } from 'vitest'
import { timeZoneName } from '@/lib/datetime'
import { autoTimeZoneLabel, timeZoneLabel } from '@/lib/timezones'

describe('timeZoneLabel', () => {
  it('берёт подпись из короткого списка для известного пояса', () => {
    expect(timeZoneLabel('Asia/Yekaterinburg')).toBe('Екатеринбург (+2)')
  })

  it('берёт название из Intl для пояса вне короткого списка', () => {
    expect(timeZoneLabel('Europe/Paris')).toBe(timeZoneName('Europe/Paris'))
    expect(timeZoneLabel('Europe/Paris')).not.toBe('')
  })
})

describe('autoTimeZoneLabel', () => {
  it('называет автоматически определённый пояс из короткого списка', () => {
    expect(autoTimeZoneLabel('Asia/Yekaterinburg')).toBe(
      'Екатеринбург (+2, определено автоматически)',
    )
  })

  it('добавляет пометку к поясу вне короткого списка', () => {
    expect(autoTimeZoneLabel('Europe/Paris')).toBe(
      `${timeZoneName('Europe/Paris')}, определено автоматически`,
    )
  })
})
