import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { STATUS_PRESENTATION } from '@/lib/booking-status'
import { formatSlotTime } from '@/lib/datetime'
import type { SlotRead } from '@/lib/slots'

type SlotGridProps = {
  meetingTypeId: number
  slots: SlotRead[]
  timeZone: string
}

function busyPresentation(status: SlotRead['booking_status']) {
  if (status === 'pending' || status === 'confirmed') {
    return STATUS_PRESENTATION[status]
  }
  return null
}

function SlotGrid({ meetingTypeId, slots, timeZone }: SlotGridProps) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const time = formatSlotTime(slot.start, timeZone)
        if (slot.available) {
          return (
            <li key={slot.start}>
              <Button asChild variant="outline" className="w-full">
                <Link
                  to={`/booking/${meetingTypeId}/${encodeURIComponent(slot.start)}`}
                >
                  {time}
                </Link>
              </Button>
            </li>
          )
        }
        const presentation = busyPresentation(slot.booking_status)
        return (
          <li key={slot.start}>
            <Button
              variant="outline"
              className={`w-full disabled:opacity-100 ${presentation?.className ?? ''}`}
              disabled
              title={presentation?.label}
            >
              {time}
              {presentation ? (
                <>
                  {' '}
                  <span className="sr-only">— {presentation.label}</span>
                </>
              ) : null}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

export { SlotGrid }
