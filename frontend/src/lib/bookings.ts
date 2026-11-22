import type { components } from '@/api/schema'
import { apiClient, unwrap } from '@/lib/api'

// Типы взяты из OpenAPI-контракта: ручные копии разъезжались бы с сервером.
export type BookingRead = components['schemas']['BookingRead']
export type BookingCreate = components['schemas']['BookingCreate']
export type BookingUpdate = components['schemas']['BookingUpdate']
export type BookingStatus = components['schemas']['BookingStatus']
export type BookingMeetingType = components['schemas']['BookingMeetingTypeRead']

export function createBooking(input: BookingCreate): Promise<BookingRead> {
  return unwrap(apiClient.POST('/api/v1/bookings', { body: input }))
}

export function listBookings(): Promise<BookingRead[]> {
  return unwrap(apiClient.GET('/api/v1/bookings'))
}

export function getBooking(bookingId: number): Promise<BookingRead> {
  return unwrap(
    apiClient.GET('/api/v1/bookings/{booking_id}', {
      params: { path: { booking_id: bookingId } },
    }),
  )
}

export function decideBooking(
  bookingId: number,
  status: BookingUpdate['status'],
): Promise<BookingRead> {
  return unwrap(
    apiClient.PATCH('/api/v1/bookings/{booking_id}', {
      params: { path: { booking_id: bookingId } },
      body: { status },
    }),
  )
}
