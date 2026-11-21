// Общие тексты состояний: одинаковы на всех экранах.
export const LOAD_ERROR = 'Не удалось загрузить, попробуйте ещё раз'
export const SUBMIT_ERROR = 'Не удалось отправить, попробуйте ещё раз'
export const RETRY_LABEL = 'Повторить'
export const MEETING_TYPE_CREATED = 'Тип создан'
export const MEETING_TYPE_SAVED = 'Тип сохранён'
export const MEETING_TYPE_DELETED = 'Тип удалён'
export const DURATION_LOCKED = 'Длительность нельзя изменить: у типа есть предстоящие брони'
export const APPROVE_BOOKING_LABEL = 'Подтвердить'
export const BOOKING_ALREADY_DECIDED = 'Бронь уже обработана'
export const BOOKING_IN_PAST = 'Встреча уже прошла'
// Владельческий экран с чужой почтой: cookie не чистим, зовём войти заново.
export const OWNER_SESSION_INVALID =
  'Владельческая сессия недействительна: вы вошли с чужим email. Войдите снова.'
export const LOGIN_AGAIN_LABEL = 'Войти снова'
