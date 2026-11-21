using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace CallScheduler;

/**
 * Брони. Гость видит только свои, владелец — все предстоящие.
 * Одновременно у гостя не больше одной предстоящей брони на тип, а слот
 * не может быть занят двумя бронями: пару «тип + начало» защищает частичный
 * уникальный индекс в базе, который не учитывает отклонённые брони.
 */
@route("/api/v1/bookings")
@tag("bookings")
interface BookingRoutes {
  @get
  @summary("Предстоящие встречи: свои для гостя, все для владельца")
  list(): BookingRead[];

  @post
  @summary("Забронировать слот")
  create(
    @body payload: BookingCreate,
  ): CreatedBooking | NotFoundResponse | ConflictResponse | ValidationFailedResponse;

  @get
  @route("/{booking_id}")
  @summary("Бронь по номеру")
  read(@path booking_id: integer): BookingRead | NotFoundResponse | ValidationFailedResponse;

  @post
  @route("/{booking_id}/approve")
  @summary("Подтвердить бронь")
  approve(
    @path booking_id: integer,
  ): BookingRead | ForbiddenResponse | NotFoundResponse | ConflictResponse | ValidationFailedResponse;

  @post
  @route("/{booking_id}/reject")
  @summary("Отклонить бронь, освобождая слот")
  reject(
    @path booking_id: integer,
  ): BookingRead | ForbiddenResponse | NotFoundResponse | ConflictResponse | ValidationFailedResponse;
}
