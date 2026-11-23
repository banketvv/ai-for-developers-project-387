import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '@/test/server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  // Выбор пояса живёт в cookie; тесты не должны влиять друг на друга.
  document.cookie = 'timezone=; path=/; max-age=0'
})

afterAll(() => server.close())
