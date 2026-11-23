import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { readCookie, writeCookie } from '@/lib/cookies'
import { viewerTimeZone } from '@/lib/datetime'
import { isSupportedTimeZone } from '@/lib/timezones'

// Выбор пояса живёт в cookie и общий для всего сайта: гость правит его один
// раз, а календарь, форма, список и подтверждение показывают одно и то же время.
export const TIME_ZONE_COOKIE = 'timezone'
export const AUTO_TIME_ZONE = 'auto'

type TimeZoneContextValue = {
  preference: string
  timeZone: string
  detectedTimeZone: string
  setPreference: (value: string) => void
}

const TimeZoneContext = createContext<TimeZoneContextValue | null>(null)

function readPreference(): string {
  const stored = readCookie(TIME_ZONE_COOKIE)
  if (stored && stored !== AUTO_TIME_ZONE && isSupportedTimeZone(stored)) {
    return stored
  }
  return AUTO_TIME_ZONE
}

function TimeZoneProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<string>(readPreference)
  // Пояс браузера не меняется за время сессии; запоминаем его для режима «авто».
  const [detectedTimeZone] = useState(viewerTimeZone)
  const timeZone =
    preference === AUTO_TIME_ZONE ? detectedTimeZone : preference

  const setPreference = useCallback((value: string) => {
    setPreferenceState(value)
    writeCookie(TIME_ZONE_COOKIE, value)
  }, [])

  const value = useMemo(
    () => ({ preference, timeZone, detectedTimeZone, setPreference }),
    [preference, timeZone, detectedTimeZone, setPreference],
  )

  return (
    <TimeZoneContext.Provider value={value}>
      {children}
    </TimeZoneContext.Provider>
  )
}

function useTimeZone(): TimeZoneContextValue {
  const value = useContext(TimeZoneContext)
  if (!value) {
    throw new Error('useTimeZone должен вызываться внутри TimeZoneProvider')
  }
  return value
}

export { TimeZoneProvider, useTimeZone }
