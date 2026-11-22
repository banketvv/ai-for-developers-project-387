import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookingStatusBadge } from '@/components/booking-status-badge'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { decideBooking, getBooking } from '@/lib/bookings'
import type { BookingRead, BookingUpdate } from '@/lib/bookings'
import {
  formatInstantDate,
  formatSlotTime,
  timeZoneName,
  viewerTimeZone,
} from '@/lib/datetime'
import { durationLabel } from '@/lib/meeting-types'
import {
  ALREADY_DECIDED,
  DECISION_ERROR,
  DECISION_FORBIDDEN,
  LOAD_ERROR,
  RETRY_LABEL,
} from '@/lib/messages'
import { useSession } from '@/lib/session'

type LoadStatus = 'loading' | 'ready' | 'error' | 'missing'

function statusMessage(booking: BookingRead): string {
  switch (booking.status) {
    case 'pending':
      return `Заявка на «${booking.meeting_type.title}» отправлена. Встреча состоится после подтверждения владельцем.`
    case 'confirmed':
      return `Встреча «${booking.meeting_type.title}» подтверждена.`
    case 'declined':
      return `Заявка на «${booking.meeting_type.title}» отклонена.`
  }
}

function BookingConfirmationPage() {
  const params = useParams()
  const bookingId = Number(params.bookingId)
  const { isOwner } = useSession()
  // Время показывается в поясе смотрящего; пояс подписан рядом со временем.
  const timeZone = viewerTimeZone()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [booking, setBooking] = useState<BookingRead | null>(null)
  const [deciding, setDeciding] = useState<BookingUpdate['status'] | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      setBooking(await getBooking(bookingId))
      setStatus('ready')
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setStatus('missing')
      } else {
        setStatus('error')
      }
    }
  }, [bookingId])

  // Экран только читает бронь: перезагрузка страницы не создаёт новую запись.
  useEffect(() => {
    void load()
  }, [load])

  async function handleDecision(decision: BookingUpdate['status']) {
    setDecisionError(null)
    setDeciding(decision)
    try {
      setBooking(await decideBooking(bookingId, decision))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'already_decided') {
        setDecisionError(ALREADY_DECIDED)
        try {
          setBooking(await getBooking(bookingId))
        } catch {
          // Решение уже принято; если бронь не перечиталась, экран покажет прежнее состояние.
        }
      } else if (caught instanceof ApiError && caught.status === 403) {
        setDecisionError(DECISION_FORBIDDEN)
      } else {
        setDecisionError(DECISION_ERROR)
      }
    } finally {
      setDeciding(null)
    }
  }

  if (status === 'loading') {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Бронь</h1>
        <p className="mt-6 text-sm text-muted-foreground">Загрузка…</p>
      </section>
    )
  }

  if (status === 'missing') {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Бронь</h1>
        <div className="mt-6 max-w-md space-y-3">
          <p role="alert" className="text-sm text-destructive">
            Бронь не найдена
          </p>
          <Button asChild variant="outline">
            <Link to="/bookings">Предстоящие события</Link>
          </Button>
        </div>
      </section>
    )
  }

  if (status === 'error' || booking === null) {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Бронь</h1>
        <div className="mt-6 max-w-md space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {LOAD_ERROR}
          </p>
          <Button variant="outline" onClick={() => void load()}>
            {RETRY_LABEL}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Бронь №{booking.id}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {statusMessage(booking)}
      </p>
      <dl className="mt-8 max-w-lg space-y-3 rounded-xl border border-border bg-card p-6 text-sm shadow-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Статус</dt>
          <dd className="text-right font-medium">
            <BookingStatusBadge status={booking.status} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Дата</dt>
          <dd className="text-right font-medium">
            {formatInstantDate(booking.start, timeZone)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Время</dt>
          <dd className="text-right font-medium">
            {formatSlotTime(booking.start, timeZone)} ·{' '}
            {timeZoneName(timeZone)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Гость</dt>
          <dd className="text-right font-medium">{booking.guest_name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Длительность</dt>
          <dd className="text-right font-medium">
            {durationLabel(booking.meeting_type.duration_minutes)}
          </dd>
        </div>
      </dl>
      {isOwner && booking.status === 'pending' ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            disabled={deciding !== null}
            onClick={() => void handleDecision('confirmed')}
          >
            {deciding === 'confirmed' ? 'Подтверждаем…' : 'Подтвердить'}
          </Button>
          <Button
            variant="outline"
            disabled={deciding !== null}
            onClick={() => void handleDecision('declined')}
          >
            {deciding === 'declined' ? 'Отклоняем…' : 'Отклонить'}
          </Button>
        </div>
      ) : null}
      {decisionError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {decisionError}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to="/bookings">Предстоящие события</Link>
        </Button>
        {booking.status === 'declined' ? (
          <Button asChild variant="outline">
            <Link to={`/booking/${booking.meeting_type.id}`}>
              Выбрать другое время
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/booking">Записаться ещё раз</Link>
          </Button>
        )}
      </div>
    </section>
  )
}

export { BookingConfirmationPage }
