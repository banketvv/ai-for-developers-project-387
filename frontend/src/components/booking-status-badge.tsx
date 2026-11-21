import type { BookingStatus } from '@/lib/bookings'
import { BOOKING_STATUS_LABELS } from '@/lib/bookings'

// Полупрозрачные оттенки читаются и в светлой, и в тёмной теме.
const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'border-brand/40 bg-brand/10 text-foreground',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-foreground',
  rejected: 'border-destructive/40 bg-destructive/10 text-destructive',
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  )
}

export { BookingStatusBadge }
