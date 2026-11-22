import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '@/App'
import type { BookingRead } from '@/lib/bookings'
import { bookingUrl, bookingsUrl, server, sessionUrl } from '@/test/server'

const BOOKING: BookingRead = {
  id: 42,
  start: '2026-11-16T06:00:00Z',
  guest_name: 'Иван',
  guest_email: 'guest@example.com',
  created_at: '2026-11-16T09:00:00',
  status: 'pending',
  meeting_type: { id: 7, title: 'Знакомство', duration_minutes: 60 },
}

function ownerSession() {
  return http.get(sessionUrl, () =>
    HttpResponse.json({
      email: 'owner@example.com',
      is_owner: true,
      owner_name: 'Владелец календаря',
    }),
  )
}

function renderConfirmation(bookingId = BOOKING.id) {
  return render(
    <MemoryRouter initialEntries={[`/bookings/${bookingId}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('BookingConfirmationPage', () => {
  it('показывает номер, тип, дату, время и длительность брони', async () => {
    server.use(
      http.get(bookingUrl(BOOKING.id), () => HttpResponse.json(BOOKING)),
    )

    renderConfirmation()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Бронь №42' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Заявка на «Знакомство» отправлена/),
    ).toBeInTheDocument()
    expect(screen.getByText('Ожидает подтверждения')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Подтвердить' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('понедельник, 16 ноября')).toBeInTheDocument()
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
    expect(screen.getByText('60 минут')).toBeInTheDocument()
    expect(screen.getByText('Гость')).toBeInTheDocument()
    expect(screen.getByText('Иван')).toBeInTheDocument()

    const main = screen.getByRole('main')
    expect(
      within(main).getByRole('link', { name: 'Предстоящие события' }),
    ).toHaveAttribute('href', '/bookings')
    expect(
      within(main).getByRole('link', { name: 'Записаться ещё раз' }),
    ).toHaveAttribute('href', '/booking')
  })

  it('не создаёт бронь при перезагрузке страницы подтверждения', async () => {
    let created = 0
    server.use(
      http.post(bookingsUrl, () => {
        created += 1
        return HttpResponse.json(BOOKING, { status: 201 })
      }),
      http.get(bookingUrl(BOOKING.id), () => HttpResponse.json(BOOKING)),
    )

    const first = renderConfirmation()
    await screen.findByRole('heading', { level: 1, name: 'Бронь №42' })
    first.unmount()
    renderConfirmation()
    await screen.findByRole('heading', { level: 1, name: 'Бронь №42' })

    expect(created).toBe(0)
  })

  it('отличает чужую бронь от ошибки загрузки', async () => {
    server.use(
      http.get(bookingUrl(BOOKING.id), () =>
        HttpResponse.json(
          { error: { code: 'not_found', message: 'Бронь не найдена' } },
          { status: 404 },
        ),
      ),
    )

    renderConfirmation()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Бронь не найдена',
    )
    expect(
      within(screen.getByRole('main')).getByRole('link', {
        name: 'Предстоящие события',
      }),
    ).toHaveAttribute('href', '/bookings')
  })

  it('показывает ошибку загрузки и повторяет запрос', async () => {
    const user = userEvent.setup()
    let attempts = 0
    server.use(
      http.get(bookingUrl(BOOKING.id), () => {
        attempts += 1
        if (attempts === 1) {
          return new HttpResponse(null, { status: 500 })
        }
        return HttpResponse.json(BOOKING)
      }),
    )

    renderConfirmation()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось загрузить, попробуйте ещё раз',
    )

    await user.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Бронь №42' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('показывает отклонённую бронь и путь к выбору другого времени', async () => {
    server.use(
      http.get(bookingUrl(BOOKING.id), () =>
        HttpResponse.json({ ...BOOKING, status: 'declined' }),
      ),
    )

    renderConfirmation()

    expect(
      await screen.findByText(/Заявка на «Знакомство» отклонена/),
    ).toBeInTheDocument()
    expect(screen.getByText('Отклонена')).toBeInTheDocument()
    expect(
      within(screen.getByRole('main')).getByRole('link', {
        name: 'Выбрать другое время',
      }),
    ).toHaveAttribute('href', '/booking/7')
  })

  it('владелец подтверждает заявку и видит обновлённый статус', async () => {
    const user = userEvent.setup()
    server.use(
      ownerSession(),
      http.get(bookingUrl(BOOKING.id), () => HttpResponse.json(BOOKING)),
      http.patch(bookingUrl(BOOKING.id), async ({ request }) => {
        const body = (await request.json()) as { status: string }
        return HttpResponse.json({ ...BOOKING, status: body.status })
      }),
    )

    renderConfirmation()

    const confirm = await screen.findByRole('button', { name: 'Подтвердить' })
    expect(
      screen.getByRole('button', { name: 'Отклонить' }),
    ).toBeInTheDocument()
    await user.click(confirm)

    expect(
      await screen.findByText(/Встреча «Знакомство» подтверждена/),
    ).toBeInTheDocument()
    expect(screen.getByText('Подтверждена')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Подтвердить' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Отклонить' }),
    ).not.toBeInTheDocument()
  })

  it('владелец отклоняет заявку и возвращает гостю путь к новой записи', async () => {
    const user = userEvent.setup()
    server.use(
      ownerSession(),
      http.get(bookingUrl(BOOKING.id), () => HttpResponse.json(BOOKING)),
      http.patch(bookingUrl(BOOKING.id), () =>
        HttpResponse.json({ ...BOOKING, status: 'declined' }),
      ),
    )

    renderConfirmation()

    await user.click(await screen.findByRole('button', { name: 'Отклонить' }))

    expect(
      await screen.findByText(/Заявка на «Знакомство» отклонена/),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('main')).getByRole('link', {
        name: 'Выбрать другое время',
      }),
    ).toHaveAttribute('href', '/booking/7')
  })

  it('объясняет, что решение по брони уже принято', async () => {
    const user = userEvent.setup()
    server.use(
      ownerSession(),
      http.get(bookingUrl(BOOKING.id), () => HttpResponse.json(BOOKING)),
      http.patch(bookingUrl(BOOKING.id), () =>
        HttpResponse.json(
          {
            error: {
              code: 'already_decided',
              message: 'Решение по этой брони уже принято',
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderConfirmation()

    await user.click(await screen.findByRole('button', { name: 'Подтвердить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Решение по этой брони уже принято',
    )
  })

  it('объясняет, что решение доступно только владельцу', async () => {
    const user = userEvent.setup()
    server.use(
      ownerSession(),
      http.get(bookingUrl(BOOKING.id), () => HttpResponse.json(BOOKING)),
      http.patch(bookingUrl(BOOKING.id), () =>
        HttpResponse.json(
          {
            error: {
              code: 'forbidden',
              message: 'Действие доступно только владельцу',
            },
          },
          { status: 403 },
        ),
      ),
    )

    renderConfirmation()

    await user.click(await screen.findByRole('button', { name: 'Подтвердить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Подтвердить или отклонить заявку может только владелец',
    )
  })
})
