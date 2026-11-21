import { expect, test } from '@playwright/test'
import { OWNER_EMAIL, seedMeetingType } from './support/api'

test('владелец входит, создаёт, правит и удаляет тип встречи', async ({
  page,
}) => {
  await page.goto('/owner')
  await page.getByLabel('Email владельца').fill(OWNER_EMAIL)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(/Вы вошли как владелец/)).toBeVisible()

  await page.goto('/booking')
  await page.getByRole('link', { name: 'Создать тип' }).click()
  await page.getByLabel('Название').fill('Консультация')
  await page.getByLabel('Длительность').selectOption('45')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()

  await expect(page.getByText('Тип создан')).toBeVisible()
  await expect(page.getByText('Консультация')).toBeVisible()

  await page.getByRole('link', { name: 'Изменить Консультация' }).click()
  await page.getByLabel('Название').fill('Разбор')
  await page.getByRole('button', { name: 'Сохранить' }).click()

  await expect(page.getByText('Тип сохранён')).toBeVisible()
  await expect(page.getByText('Разбор')).toBeVisible()

  await page.getByRole('link', { name: 'Изменить Разбор' }).click()
  await page.getByRole('button', { name: 'Удалить тип' }).click()
  await expect(page.getByText(/Будет удалён тип|Тип будет удалён/)).toBeVisible()
  await page.getByRole('button', { name: 'Удалить', exact: true }).click()

  await expect(page.getByText('Тип удалён')).toBeVisible()
  await expect(page.getByText('Разбор')).toHaveCount(0)
})

test('владелец подтверждает бронь, гость видит подтверждение', async ({
  page,
}) => {
  await seedMeetingType('Согласование', 30)

  await page.goto('/booking')
  await page.getByRole('link', { name: /Согласование/ }).click()
  await page.getByRole('link', { name: /^\d{2}:\d{2}$/ }).first().click()
  await page.getByLabel('Имя').fill('Гость')
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(page.getByText('Ожидает подтверждения')).toBeVisible()
  const bookingPath = new URL(page.url()).pathname
  const guestCookies = await page.context().cookies()

  // Владелец входит на том же устройстве: его cookie заменяет гостевую.
  await page.goto('/owner')
  await page.getByLabel('Email владельца').fill(OWNER_EMAIL)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(/Вы вошли как владелец/)).toBeVisible()

  await page.goto('/bookings')
  const card = page.getByRole('article', { name: /Согласование/ })
  await expect(card.getByText('Ожидает подтверждения')).toBeVisible()
  await card.getByRole('button', { name: 'Подтвердить' }).click()
  await expect(card.getByText('Бронь подтверждена')).toBeVisible()
  await expect(
    card.getByRole('button', { name: 'Подтвердить' }),
  ).toHaveCount(0)

  // Гость возвращается и видит тот же статус на подтверждении и в списке.
  await page.context().clearCookies()
  await page.context().addCookies(guestCookies)
  await page.goto(bookingPath)
  await expect(page.getByText('Бронь подтверждена')).toBeVisible()
  await page.goto('/bookings')
  await expect(page.getByText('Бронь подтверждена')).toBeVisible()
})


test('владелец отклоняет бронь, гость записывается на освободившийся слот', async ({
  page,
}) => {
  await seedMeetingType('Отказ', 30)

  await page.goto('/booking')
  await page.getByRole('link', { name: /Отказ/ }).click()
  const slotLink = page.getByRole('link', { name: /^\d{2}:\d{2}$/ }).first()
  const slotTime = (await slotLink.textContent())?.trim() ?? ''
  await slotLink.click()
  await page.getByLabel('Имя').fill('Гость')
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(page.getByText('Ожидает подтверждения')).toBeVisible()
  const bookingPath = new URL(page.url()).pathname
  const guestCookies = await page.context().cookies()

  await page.goto('/owner')
  await page.getByLabel('Email владельца').fill(OWNER_EMAIL)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(/Вы вошли как владелец/)).toBeVisible()

  await page.goto('/bookings')
  const card = page.getByRole('article', { name: /Отказ/ })
  await expect(card.getByText('Ожидает подтверждения')).toBeVisible()
  await card.getByRole('button', { name: 'Отклонить' }).click()
  await expect(page.getByRole('article', { name: /Отказ/ })).toHaveCount(0)

  // Отклонённая бронь исчезает и по прямой ссылке.
  await page.context().clearCookies()
  await page.context().addCookies(guestCookies)
  await page.goto(bookingPath)
  await expect(page.getByText('Бронь не найдена')).toBeVisible()

  // Слот освободился: тот же гость сразу записывается на то же время снова.
  await page.goto('/booking')
  await page.getByRole('link', { name: /Отказ/ }).click()
  await expect(
    page.getByRole('link', { name: slotTime, exact: true }),
  ).toHaveAttribute('href', /booking\/\d+\/\d{4}-\d{2}-\d{2}T/)
  await page.getByRole('link', { name: slotTime, exact: true }).click()
  await page.getByLabel('Имя').fill('Гость')
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(page.getByText('Ожидает подтверждения')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /^Бронь №\d+$/ }),
  ).toBeVisible()
})
