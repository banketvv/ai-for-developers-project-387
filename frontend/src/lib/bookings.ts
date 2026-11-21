import type { components } from '@/api/schema'
import { ApiError, apiClient, unwrap } from '@/lib/api'
import {
  BOOKING_ALREADY_DECIDED,
  BOOKING_IN_PAST,
  SUBMIT_ERROR,
} from '@/lib/messages'

// Типы взяты из OpenAPI-контракта: ручные копии разъезжались бы с сервером.
export type BookingRead = components['schemas']['BookingRead']
export type BookingCreate = components['schemas']['BookingCreate']
export type BookingMeetingType = components['schemas']['BookingMeetingTypeRead']
export type BookingStatus = BookingRead['status']

// Тексты плашек статуса одинаковы на подтверждении и в списке предстоящих.
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Ожидает подтверждения',
  approved: 'Бронь подтверждена',
  rejected: 'Бронь отклонена',
}

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

export function approveBooking(bookingId: number): Promise<BookingRead> {
  return unwrap(
    apiClient.POST('/api/v1/bookings/{booking_id}/approve', {
      params: { path: { booking_id: bookingId } },
    }),
  )
}

export function rejectBooking(bookingId: number): Promise<BookingRead> {
  return unwrap(
    apiClient.POST('/api/v1/bookings/{booking_id}/reject', {
      params: { path: { booking_id: bookingId } },
    }),
  )
}

// Доменные ответы решения объясняются на странице; остальное — общей ошибкой сети.
export function bookingActionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'invalid_status') {
      return BOOKING_ALREADY_DECIDED
    }
    if (error.code === 'booking_in_past') {
      return BOOKING_IN_PAST
    }
  }
  return SUBMIT_ERROR
}
