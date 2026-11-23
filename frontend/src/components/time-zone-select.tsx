import { useMemo } from 'react'
import { timeZoneName } from '@/lib/datetime'
import { AUTO_TIME_ZONE, useTimeZone } from '@/lib/timezone'
import { COMMON_TIME_ZONES } from '@/lib/timezones'
import type { TimeZoneOption } from '@/lib/timezones'

function TimeZoneSelect() {
  const { preference, setPreference } = useTimeZone()

  // Сохранённый пояс может не входить в короткий список — показываем его,
  // чтобы select не потерял текущее значение.
  const options = useMemo<TimeZoneOption[]>(() => {
    if (
      preference === AUTO_TIME_ZONE ||
      COMMON_TIME_ZONES.some((option) => option.value === preference)
    ) {
      return COMMON_TIME_ZONES
    }
    return [
      ...COMMON_TIME_ZONES,
      { value: preference, label: timeZoneName(preference) },
    ]
  }, [preference])

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="time-zone-select"
        className="text-xs text-muted-foreground"
      >
        Часовой пояс
      </label>
      <select
        id="time-zone-select"
        value={preference}
        onChange={(event) => setPreference(event.target.value)}
        className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value={AUTO_TIME_ZONE}>Определить автоматически</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export { TimeZoneSelect }
