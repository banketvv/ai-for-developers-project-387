# Календарь звонков (продолжение)


[![hexlet-check](https://github.com/banketvv/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/banketvv/ai-for-developers-project-387/actions)

Интегрируйте работу агентов в GitHub проект

Это продолжение первого проекта «Календарь звонков». Исходная спецификация и принятые решения живут в первом репозитории:

- [Спецификация](https://github.com/banketvv/ai-for-developers-project-386/issues/14)
- [Карта решений](https://github.com/banketvv/ai-for-developers-project-386/issues/2)

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- Разное

## Установка

<!-- Опишите установку: клонирование, зависимости, переменные окружения -->

```bash
git clone https://github.com/banketvv/ai-for-developers-project-387.git
cd ai-for-developers-project-387
```

## Использование

Работающее приложение из предыдущего проекта: https://call-scheduler-hexlet.onrender.com/

<!-- Добавьте примеры запуска и запись asciinema — именно это смотрит работодатель -->

## OpenCode в GitHub

В репозитории настроен workflow [`.github/workflows/opencode.yml`](.github/workflows/opencode.yml): агент запускается по комментарию к issue или PR и отвечает в том же обсуждении.

- **Команды:** `/oc` или `/opencode` в начале комментария. Доступно владельцу, участникам и коллабораторам репозитория.
- **Пример:** `/oc explain this issue`.
- **Модель:** `deepseek/deepseek-flash`. Ключ DeepSeek хранится в секрете `OPENCODE_API_KEY` и передаётся агенту как `DEEPSEEK_API_KEY`.
- **Одновременность:** запуски по одной задаче выполняются последовательно благодаря `concurrency` по номеру issue; таймаут job — 30 минут.
- **Права:** `contents: read` и `id-token: write` — только для обмена OIDC-токена на scoped-токен OpenCode App. Код PR не checkout-ится, `persist-credentials: false`.
- **Доступ к файлам:** агенту разрешены `/tmp/*` и `/home/runner/work/*` (правило `external_directory` в `opencode.json`).
- **Безопасность:** все action закреплены на полные SHA, версия OpenCode зафиксирована на `1.19.6`, а исключения jactionlint для `dangerous-triggers` и `excessive-permissions` действуют до `2027-05-22`.
- **Проверка workflow:** `mise run actions:lint`; она входит в общую `mise run check`.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
