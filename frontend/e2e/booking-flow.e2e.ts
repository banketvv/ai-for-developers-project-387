import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { OWNER_EMAIL, seedMeetingType } from './support/api'

type GuestCookie = NonNullable<Awaited<ReturnType<BrowserContext['cookies']>>[number]>

async function guestCookie(context: BrowserContext): Promise<GuestCookie> {
  const cookie = (await context.cookies()).find(
    (each) => each.name === 'guest_email',
  )
  if (!cookie) {
    throw new Error('Гостевая cookie не появилась после записи')
  }
  return cookie
}

async function bookFirstSlot(
  page: Page,
  options: { title: string; name: string; email: string },
): Promise<{ formUrl: string; bookingId: number }> {
  await page.goto('/booking')
  await page.getByRole('link', { name: new RegExp(options.title) }).click()
  await page.getByRole('link', { name: /^\d{2}:\d{2}$/ }).first().click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Оформление записи' }),
  ).toBeVisible()
  const formUrl = page.url()
  await page.getByLabel('Имя').fill(options.name)
  await page.getByLabel('Email').fill(options.email)
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(page.getByRole('heading', { name: /Бронь №\d+/ })).toBeVisible()
  const bookingId = Number(new URL(page.url()).pathname.split('/').at(-1))
  return { formUrl, bookingId }
}

async function logInAsOwner(page: Page): Promise<void> {
  await page.goto('/owner')
  await page.getByLabel('Email владельца').fill(OWNER_EMAIL)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(/Вы вошли как владелец/)).toBeVisible()
}

// Сценарий проверяет то, чего не видит jsdom: настоящий браузер, настоящий
// бэкенд, настоящая cookie и переходы между экранами.
test('гость оставляет заявку и видит её в предстоящих', async ({ page }) => {
  await seedMeetingType('Знакомство', 30)

  await page.goto('/booking')
  await page.getByRole('link', { name: /Знакомство/ }).click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Знакомство' }),
  ).toBeVisible()
  // Пояс подписан один раз в заголовке раздела; браузер теста — Москва.
  await expect(
    page.getByRole('heading', { name: /Свободное время/ }),
  ).toContainText('Москва')

  // Календарь сам выбирает первый день окна; берём первый свободный слот.
  await page.getByRole('link', { name: /^\d{2}:\d{2}$/ }).first().click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Оформление записи' }),
  ).toBeVisible()
  await page.getByLabel('Имя').fill('Иван')
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(
    page.getByRole('heading', { name: /Бронь №\d+/ }),
  ).toBeVisible()
  await expect(page.getByText(/Заявка на «Знакомство» отправлена/)).toBeVisible()
  await expect(page.getByText('Ожидает подтверждения')).toBeVisible()
  await expect(page.getByText('Иван')).toBeVisible()

  await page
    .getByRole('main')
    .getByRole('link', { name: 'Предстоящие события' })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Предстоящие события' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Знакомство/ })).toBeVisible()
  await expect(page.getByText('Ожидает подтверждения')).toBeVisible()

  // Перезагрузка списка не создаёт вторую бронь и не теряет запись.
  await page.reload()
  await expect(page.getByRole('link', { name: /Знакомство/ })).toBeVisible()
})

test('гость без броней видит пустое состояние', async ({ page }) => {
  await page.goto('/bookings')

  await expect(page.getByText(/пока нет/i)).toBeVisible()
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Записаться', exact: true }),
  ).toBeVisible()
})

test('владелец подтверждает заявку, гость видит подтверждение', async ({
  page,
  context,
}) => {
  await seedMeetingType('Согласование', 30)
  const { bookingId } = await bookFirstSlot(page, {
    title: 'Согласование',
    name: 'Иван',
    email: 'approve@example.com',
  })
  const savedGuestCookie = await guestCookie(context)

  await logInAsOwner(page)
  await page.goto('/bookings')
  await page.getByRole('link', { name: /Согласование/ }).click()
  await expect(page.getByRole('heading', { name: /Бронь №\d+/ })).toBeVisible()
  await expect(page.getByText('Ожидает подтверждения')).toBeVisible()

  await page.getByRole('button', { name: 'Подтвердить' }).click()

  await expect(page.getByText(/Встреча «Согласование» подтверждена/)).toBeVisible()
  await expect(page.getByText('Подтверждена', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Подтвердить' })).toHaveCount(0)

  await context.addCookies([savedGuestCookie])
  await page.goto(`/bookings/${bookingId}`)
  await expect(page.getByText(/Встреча «Согласование» подтверждена/)).toBeVisible()
})

test('владелец отклоняет заявку, и гость записывается на тот же слот снова', async ({
  page,
  context,
}) => {
  await seedMeetingType('Отказ', 30)
  const { formUrl, bookingId } = await bookFirstSlot(page, {
    title: 'Отказ',
    name: 'Мария',
    email: 'decline@example.com',
  })
  const savedGuestCookie = await guestCookie(context)

  await logInAsOwner(page)
  await page.goto('/bookings')
  await page.getByRole('link', { name: /Отказ/ }).click()
  await page.getByRole('button', { name: 'Отклонить' }).click()

  await expect(page.getByText(/Заявка на «Отказ» отклонена/)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Выбрать другое время' }),
  ).toBeVisible()

  await context.addCookies([savedGuestCookie])
  await page.goto(formUrl)
  await page.getByLabel('Имя').fill('Мария')
  await page.getByLabel('Email').fill('decline@example.com')
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(page.getByRole('heading', { name: /Бронь №\d+/ })).toBeVisible()
  await expect(page.getByText('Ожидает подтверждения')).toBeVisible()
  expect(Number(new URL(page.url()).pathname.split('/').at(-1))).not.toBe(bookingId)
})
