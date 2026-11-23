// Короткий список распространённых поясов: полный список IANA не нужен,
// а «определить автоматически» остаётся запасным вариантом.

export type TimeZoneOption = {
  value: string
  label: string
}

export const COMMON_TIME_ZONES: TimeZoneOption[] = [
  { value: 'Europe/Kaliningrad', label: 'Калининград' },
  { value: 'Europe/Moscow', label: 'Москва' },
  { value: 'Europe/Samara', label: 'Самара' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург' },
  { value: 'Asia/Omsk', label: 'Омск' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск' },
  { value: 'Asia/Irkutsk', label: 'Иркутск' },
  { value: 'Asia/Yakutsk', label: 'Якутск' },
  { value: 'Asia/Vladivostok', label: 'Владивосток' },
  { value: 'Asia/Magadan', label: 'Магадан' },
  { value: 'Asia/Kamchatka', label: 'Петропавловск-Камчатский' },
  { value: 'Asia/Almaty', label: 'Алматы' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси' },
  { value: 'Asia/Yerevan', label: 'Ереван' },
  { value: 'Asia/Dubai', label: 'Дубай' },
  { value: 'Asia/Shanghai', label: 'Шанхай' },
  { value: 'Asia/Tokyo', label: 'Токио' },
  { value: 'Europe/London', label: 'Лондон' },
  { value: 'Europe/Berlin', label: 'Берлин' },
  { value: 'America/New_York', label: 'Нью-Йорк' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес' },
  { value: 'UTC', label: 'UTC' },
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
