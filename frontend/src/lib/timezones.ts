// Короткий список распространённых поясов: полный список IANA не нужен,
// а «определить автоматически» остаётся запасным вариантом.

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

// Пояс годится, только если Intl его знает: cookie могла сохранить мусор.
export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}
