# Календарь звонков (продолжение)


[![hexlet-check](https://github.com/banketvv/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/banketvv/ai-for-developers-project-387/actions)

Интегрируйте работу агентов в GitHub проект

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Демо

Приложение задеплоено: https://call-scheduler-hexlet.onrender.com/

Бесплатный инстанс Render засыпает без трафика, поэтому первый запрос после паузы может занять до минуты.

## Воркфлоу GitHub Actions

Все рабочие процессы лежат в `.github/workflows/`. Сторонние экшены закреплены по SHA коммита, а сами файлы проверяет `jactionlint` (входит в `mise run check`).

### `opencode.yml` — команды `/oc` в комментариях

Позволяет запускать агента OpenCode прямо из обсуждения, не заводя локальную копию репозитория.

- **Триггеры:** создание комментария к issue (`issue_comment`) и к строке pull request (`pull_request_review_comment`).
- **Кто может вызвать:** только пользователи с `author_association` равным `OWNER`, `MEMBER` или `COLLABORATOR`. Комментарии остальных участников игнорируются.
- **Команда:** текст комментария должен содержать `/oc` или `/opencode`. Всё, что написано после команды, становится заданием агенту.
- **Модель:** `deepseek/deepseek-flash`, ключ берётся из секрета `DEEPSEEK_API_KEY`.
- **Права:** у самого workflow `permissions: {}`, у job — только `contents: read` и `id-token: write`; изменения агент отправляет через GitHub App, а не через `GITHUB_TOKEN`.
- **Ограничения:** job живёт не дольше 15 минут, а `concurrency` выстраивает запуски в очередь по номеру issue/PR, чтобы несколько команд не работали одновременно.
- **Правило-исключение:** триггер `issue_comment` помечен в `.github/jactionlint.yaml` как осознанное исключение из правила `dangerous-triggers` (до 2027-05-21), потому что это документированный способ вызвать `/oc`; защита обеспечивается проверкой автора и правами токена.

Агент может не только отвечать, но и вносить изменения: создать ветку, закоммитить и открыть pull request.

### `ci.yml` — проверки на каждый push

Запускается на push в любую ветку. Ставит инструменты через `mise`, кэширует `uv` и `npm`, выполняет `mise run setup:ci`, устанавливает Chromium для Playwright и запускает `mise run check` — контракт (`api:check`), линт workflow (`actions:lint`), backend (ruff + mypy + pytest), frontend (oxlint + vitest + `tsc`/`vite build`) и браузерные E2E-тесты. Задачи идут параллельно, падение любой из них делает прогон красным.

### `release-please.yml` — релизы

Реагирует на push в `main`. По Conventional Commits ведёт открытый release-PR: поднимает `version.txt`, обновляет `CHANGELOG.md`, а после мержа создаёт тег и GitHub Release. Название PR при squash-мерже становится сообщением коммита, поэтому оно тоже должно быть в формате Conventional Commits.

### `hexlet-check.yml` — проверка Хекслета

Автоматически сгенерированный файл: запускает тесты платформы на каждый push и тег. Его нельзя удалять, редактировать или переименовывать, как и сам репозиторий.

## Стек

- Разное

## Установка

<!-- Опишите установку: клонирование, зависимости, переменные окружения -->

```bash
git clone https://github.com/banketvv/ai-for-developers-project-387.git
cd ai-for-developers-project-387
```

## Использование

<!-- Добавьте примеры запуска и запись asciinema — именно это смотрит работодатель -->

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
