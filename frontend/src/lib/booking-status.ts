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

export { STATUS_PRESENTATION }
