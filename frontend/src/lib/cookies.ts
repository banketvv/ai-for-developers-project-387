const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

export function readCookie(name: string): string | null {
  const prefix = `${name}=`
  const entry = document.cookie
    .split('; ')
    .find((each) => each.startsWith(prefix))
  if (!entry) {
    return null
  }
  try {
    return decodeURIComponent(entry.slice(prefix.length))
  } catch {
    return null
  }
}

export function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}
