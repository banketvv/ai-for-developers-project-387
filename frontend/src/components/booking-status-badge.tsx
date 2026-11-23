import type { BookingStatus } from '@/lib/bookings'
import { STATUS_PRESENTATION } from '@/lib/booking-status'

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const presentation = STATUS_PRESENTATION[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${presentation.className}`}
    >
      {presentation.label}
    </span>
  )
}

export { BookingStatusBadge }
