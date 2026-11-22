using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace CallScheduler;

/**
 * Брони. Новая бронь — заявка `pending`, которую владелец подтверждает
 * или отклоняет. Отклонённая бронь не занимает слот, поэтому тот же слот
 * можно запросить снова. Гость видит только свои брони, владелец — все
 * предстоящие. Одновременно у гостя не больше одной живой брони на тип,
 * а слот не может быть занят двумя живыми бронями: пару «тип + начало»
 * защищает частичный уникальный индекс в базе.
 */
@route("/api/v1/bookings")
@tag("bookings")
interface BookingRoutes {
  @get
  @summary("Предстоящие встречи: свои для гостя, все для владельца")
  list(): BookingRead[];

  @post
  @summary("Отправить заявку на слот")
  create(
    @body payload: BookingCreate,
  ): CreatedBooking | NotFoundResponse | ConflictResponse | ValidationFailedResponse;

  @get
  @route("/{booking_id}")
  @summary("Бронь по номеру")
  read(@path booking_id: integer): BookingRead | NotFoundResponse | ValidationFailedResponse;

  @patch
  @route("/{booking_id}")
  @summary("Подтвердить или отклонить заявку владельцем")
  update(
    @path booking_id: integer,
    @body payload: BookingUpdate,
  ): BookingRead | ForbiddenResponse | NotFoundResponse | ConflictResponse | ValidationFailedResponse;
}
