import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookingStatusBadge } from '@/components/booking-status-badge'
import { Button } from '@/components/ui/button'
import {
  approveBooking,
  bookingActionErrorMessage,
  listBookings,
  rejectBooking,
} from '@/lib/bookings'
import type { BookingRead } from '@/lib/bookings'
import {
  formatInstantDate,
  formatSlotTime,
  timeZoneName,
  viewerTimeZone,
} from '@/lib/datetime'
import { durationLabel } from '@/lib/meeting-types'
import {
  APPROVE_BOOKING_LABEL,
  LOAD_ERROR,
  REJECT_BOOKING_LABEL,
  RETRY_LABEL,
} from '@/lib/messages'
import { useSession } from '@/lib/session'

type LoadStatus = 'loading' | 'ready' | 'error'

function BookingsPage() {
  // Пояс смотрящего подписан один раз на весь список.
  const timeZone = viewerTimeZone()
  const { email, isOwner, logOut } = useSession()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [bookings, setBookings] = useState<BookingRead[]>([])
  const [changingEmail, setChangingEmail] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setActionError(null)
    try {
      setBookings(await listBookings())
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Подтверждение меняет только одну карточку: остальной список остаётся на месте.
  async function handleApprove(bookingId: number) {
    setApprovingId(bookingId)
    setActionError(null)
    try {
      const updated = await approveBooking(bookingId)
      setBookings((current) =>
        current.map((booking) =>
          booking.id === updated.id ? updated : booking,
        ),
      )
    } catch (caught) {
      setActionError(bookingActionErrorMessage(caught))
    } finally {
      setApprovingId(null)
    }
  }

  // Отказ освобождает слот: карточка отклонённой брони исчезает из предстоящих.
  async function handleReject(bookingId: number) {
    setRejectingId(bookingId)
    setActionError(null)
    try {
      await rejectBooking(bookingId)
      setBookings((current) =>
        current.filter((booking) => booking.id !== bookingId),
      )
    } catch (caught) {
      setActionError(bookingActionErrorMessage(caught))
    } finally {
      setRejectingId(null)
    }
  }

  // Cookie чистится только явным действием: список сам её не трогает.
  async function handleChangeEmail() {
    setChangingEmail(true)
    try {
      await logOut()
      await load()
    } catch {
      setStatus('error')
    } finally {
      setChangingEmail(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Предстоящие события
        </h1>
        {!isOwner && email ? (
          <Button
            variant="outline"
            disabled={changingEmail}
            onClick={() => void handleChangeEmail()}
          >
            Сменить email
          </Button>
        ) : null}
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {isOwner
          ? 'Все предстоящие встречи с контактами гостей.'
          : 'Ваши предстоящие встречи.'}{' '}
        Время указано в поясе: {timeZoneName(timeZone)}.
      </p>
      {actionError ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      {status === 'error' ? (
        <div className="mt-8 max-w-md space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {LOAD_ERROR}
          </p>
          <Button variant="outline" onClick={() => void load()}>
            {RETRY_LABEL}
          </Button>
        </div>
      ) : status === 'loading' ? (
        <p className="mt-8 text-sm text-muted-foreground">Загрузка…</p>
      ) : bookings.length === 0 ? (
        <div className="mt-8 max-w-md space-y-3">
          <p className="text-sm text-muted-foreground">
            Пока нет предстоящих встреч.{' '}
            {isOwner
              ? 'Здесь появятся брони гостей.'
              : 'Выберите свободное время и запишитесь.'}
          </p>
          <Button asChild variant="outline">
            <Link to="/booking">
              {isOwner ? 'К типам встреч' : 'Записаться'}
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <article
                aria-labelledby={`booking-${booking.id}`}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-brand"
              >
                <Link
                  to={`/bookings/${booking.id}`}
                  className="block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h2
                      id={`booking-${booking.id}`}
                      className="text-xl font-semibold tracking-tight"
                    >
                      {booking.meeting_type.title}
                    </h2>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatInstantDate(booking.start, timeZone)},{' '}
                    {formatSlotTime(booking.start, timeZone)} ·{' '}
                    {durationLabel(booking.meeting_type.duration_minutes)}
                  </p>
                  {isOwner ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {booking.guest_name} · {booking.guest_email}
                    </p>
                  ) : null}
                </Link>
                {isOwner && booking.status === 'pending' ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      disabled={
                        approvingId === booking.id ||
                        rejectingId === booking.id
                      }
                      onClick={() => void handleApprove(booking.id)}
                    >
                      {APPROVE_BOOKING_LABEL}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        rejectingId === booking.id ||
                        approvingId === booking.id
                      }
                      onClick={() => void handleReject(booking.id)}
                    >
                      {REJECT_BOOKING_LABEL}
                    </Button>
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export { BookingsPage }
