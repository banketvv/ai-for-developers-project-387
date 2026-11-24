// Короткий список распространённых поясов: полный список IANA не нужен,
// а «определить автоматически» остаётся запасным вариантом.

import { timeZoneName } from '@/lib/datetime'

export type TimeZoneOption = {
  value: string
  label: string
}

export const COMMON_TIME_ZONES: TimeZoneOption[] = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (-1)' },
  { value: 'Europe/Moscow', label: 'Москва (+0)' },
  { value: 'Europe/Samara', label: 'Самара (+1)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (+2)' },
  { value: 'Asia/Omsk', label: 'Омск (+3)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (+4)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (+5)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (+6)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (+7)' },
  { value: 'Asia/Magadan', label: 'Магадан (+8)' },
  { value: 'Asia/Kamchatka', label: 'Петропавловск-Камчатский (+9)' },
  { value: 'Asia/Almaty', label: 'Алматы (+2)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (+1)' },
  { value: 'Asia/Yerevan', label: 'Ереван (+1)' },
  { value: 'Asia/Dubai', label: 'Дубай (+1)' },
  { value: 'Asia/Shanghai', label: 'Шанхай (+5)' },
  { value: 'Asia/Tokyo', label: 'Токио (+6)' },
  { value: 'Europe/London', label: 'Лондон (-3)' },
  { value: 'Europe/Berlin', label: 'Берлин (-2)' },
  { value: 'America/New_York', label: 'Нью-Йорк (-8)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (-11)' },
  { value: 'UTC', label: 'UTC (-3)' },
]

// Подпись пояса для интерфейса: у распространённых поясов берём короткое имя
// со смещением из списка, остальные показываем так, как их называет Intl.
export function timeZoneLabel(timeZone: string): string {
  return (
    COMMON_TIME_ZONES.find((option) => option.value === timeZone)?.label ??
    timeZoneName(timeZone)
  )
}

const AUTO_SUFFIX = ', определено автоматически'

// В режиме «авто» подпись называет определённый пояс, а не просто «автоматически».
export function autoTimeZoneLabel(timeZone: string): string {
  const label = timeZoneLabel(timeZone)
  return label.endsWith(')')
    ? `${label.slice(0, -1)}${AUTO_SUFFIX})`
    : `${label}${AUTO_SUFFIX}`
}

// Пояс годится, только если Intl его знает: cookie могла сохранить мусор.
export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}
