import type { BookingStatus } from '@/lib/bookings'

const STATUS_PRESENTATION: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Ожидает подтверждения',
    className: 'border-amber-200 bg-amber-100 text-amber-900',
  },
  confirmed: {
    label: 'Подтверждена',
    className: 'border-emerald-200 bg-emerald-100 text-emerald-900',
  },
  declined: {
    label: 'Отклонена',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
}

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
