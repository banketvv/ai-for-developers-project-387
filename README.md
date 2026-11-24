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

- **Команды:** `/oc` или `/opencode` в начале общего комментария к issue/PR или построчного комментария в PR. Доступно владельцу, участникам и коллабораторам репозитория.
- **Пример:** `/oc explain this issue`.
- **Модель:** `deepseek/deepseek-flash`. Ключ DeepSeek хранится в секрете `OPENCODE_API_KEY` и передаётся агенту как `DEEPSEEK_API_KEY`.
- **Одновременность:** запуски по одной задаче выполняются последовательно благодаря `concurrency` по номеру issue; таймаут job — 30 минут.
- **Права:** budget — `actions: read` и `pull-requests: read`; job модели — `contents: read` и `id-token: write`; отчёт — `issues: write` и `pull-requests: write`. Код PR не checkout-ится, `persist-credentials: false`.
- **Доступ к файлам:** агенту разрешены `/tmp/*` и `/home/runner/work/*` (правило `external_directory` в `opencode.json`).
- **Безопасность:** все action закреплены на полные SHA, версия OpenCode зафиксирована на `1.19.6`, а исключения jactionlint для `dangerous-triggers` и `excessive-permissions` действуют до `2027-05-22`.
- **Workflow-файлы:** изменения в `.github/workflows/*` делает человек; агенту запись туда запрещена в конфигурации workflow `opencode.yml`, потому что у OpenCode App нет права `workflows`.
- **Проверка workflow:** `mise run actions:lint`; она входит в общую `mise run check`.

## Лимит запусков на PR

Чтобы ограничить расходы, workflow [`.github/workflows/opencode.yml`](.github/workflows/opencode.yml) проверяет бюджет **до вызова модели**. Имя файла `opencode.yml` важно: счётчик читает историю запусков именно этого workflow. На обычных issue `/oc` работает без бюджета.

- **Область:** только пул-реквесты. Учитываются `/oc` и `/opencode` в общем обсуждении и в построчных комментариях (`pull_request_review_comment`); в обычном issue `/oc` работает без лимита.
- **Бюджет:** три попытки на один PR. Каждый допущенный запрос человека к агенту расходует попытку; отмена, таймаут и повторный запуск через Re-run тоже. Новый PR получает новый бюджет, поэтому лимит не ограничивает все расходы по issue.
- **Источник счётчика:** история Actions и `run_attempt` (нужно право `actions: read`). Токен агента не может переписать эту историю, а текст PR-комментария на бюджет не влияет. Состояние сохраняется между запусками, пока история Actions не удалена и конфигурация workflow не изменена; администратор репозитория может обойти оба условия.
- **Права:** `actions: read` и `pull-requests: read` для проверки бюджета и головы PR, `id-token: write` для scoped-токена OpenCode App; отчёт публикует отдельное задание без модели с `issues: write` и `pull-requests: write` (комментарий и метка `ready-for-human`).
- **Исчерпание:** `/oc` после трёх попыток завершается без вызова модели. Отдельное задание без модели публикует причину `limit_exhausted`, последний SHA, ссылку на логи и ставит метку `ready-for-human` («нужен человек»).
- **Причины сбоя:** таймаут вызова — `timeout`, сбой подготовки инструмента или отсутствие `OPENCODE_API_KEY` — `infra`, прочая ошибка агента — `agent_failed`. Итог публикует то же задание без модели; следующее действие выбирает человек, автоматического цикла исправлений нет.

## Автотриаж

Новые обращения автоматически проходят предварительный разбор в workflow [`.github/workflows/opencode-triage.yml`](.github/workflows/opencode-triage.yml). Workflow запускается событием `issues` с типом `opened`; у события нет комментария с командой, поэтому инструкция агенту находится в `prompt`. Агент работает по навыку [`triage`](.agents/skills/triage/SKILL.md) и использует метки из [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

- **Авторы:** только `OWNER`, `MEMBER` и `COLLABORATOR`; обращения ботов и остальных авторов пропускаются.
- **Пропуск готовых тикетов:** если у issue уже есть любая статусная метка — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` или `wontfix` — повторный разбор не выполняется. Поэтому тикеты, созданные `to-tickets`, не триажатся заново.
- **Результат:** агент оставляет комментарий с пометкой `> *This was generated by AI during triage.*`. Если сведений не хватает, он задаёт конкретные вопросы и ставит `needs-info`; если сведений достаточно — ставит `needs-triage` и даёт краткий разбор. Метку категории (`bug` или `enhancement`) агент добавляет только когда она однозначна.
- **Ограничения:** запись файлов запрещена настройкой `edit: deny`; агент не меняет код, не создаёт спецификацию, ветки и PR, не закрывает обращение и никогда не переводит issue в `ready-for-agent`, `ready-for-human` или `wontfix`. Текст обращения считается данными, а не инструкциями; чтение `.env`-файлов и выход за пределы checkout запрещены.
- **Права и лимиты:** `contents: read`, `id-token: write` (обмен OIDC-токена на scoped-токен OpenCode App) и `issues: write` (метки через `GITHUB_TOKEN`); тайм-аут 15 минут; для одного issue одновременно выполняется только один запуск (`cancel-in-progress: false`).
- **Метки:** недостающие `needs-triage`, `needs-info` и `ready-for-human` workflow создаёт при первом запуске, если их ещё нет; существующие метки не меняются.
- **Модель:** та же, что в `opencode.yml`, — `deepseek/deepseek-flash`; ключ передаётся из секрета `OPENCODE_API_KEY`.

## Ревью изменений

Критерии ревью собраны в [`REVIEW.md`](REVIEW.md): инварианты календаря, контракт API, данные, frontend, тесты и гигиена PR. Шаблон пул-реквеста — [`.github/pull_request_template.md`](.github/pull_request_template.md); он требует заполнить проверки, риск и способ отката.

Автоматическое ревью на `pull_request` выполняет [`.github/workflows/opencode-review.yml`](.github/workflows/opencode-review.yml). Workflow запускает OpenCode CLI напрямую, а отдельный шаг публикует текст через `gh pr comment`. Токен раннера: `contents: read`, `issues: read`, `actions: read`, `checks: read`, `statuses: read` и `pull-requests: write`; OIDC не используется. Ревью оставляет комментарий, отменяет устаревший прогон при новом коммите и пропускает только PR из форков, где недоступны секреты. PR ботов тоже ревьюятся.

## Аудит Lighthouse

Регулярный аудит production-сборки выполняет [`.github/workflows/opencode-lighthouse.yml`](.github/workflows/opencode-lighthouse.yml). GitHub запускает `schedule` только из основной ветки; после появления файла в `main` ежедневное расписание включается само, ручной запуск тоже доступен.

- **Триггеры:** в одном файле `schedule` с cron `42 7 * * *` (каждый день в 07:42 UTC) и `workflow_dispatch` для ручной проверки.
- **Лимиты:** у задания `timeout-minutes: 20`; `concurrency` с группой `lighthouse-audit` и `cancel-in-progress: false` не даёт аудитам идти параллельно — следующий запуск ждёт текущий.
- **Сбор отчёта:** `treosh/lighthouse-ci-action` (закреплён по SHA) гоняет Lighthouse против production-URL `https://call-scheduler-hexlet.onrender.com/`. Настройки — в [`.github/lighthouse/lighthouserc.json`](.github/lighthouse/lighthouserc.json): один прогон и четыре категории (performance, accessibility, best-practices, seo).
- **Отчёты — только артефакты:** каталог `lighthouse-audit/` добавлен в `.gitignore`. JSON- и HTML-отчёты вместе с выводом агента уходят артефактом `lighthouse-audit-<run_id>` со сроком хранения 30 дней и никогда не коммитятся.
- **Находки:** проваленные взвешенные проверки Lighthouse. Ключ дедупликации — id правила Lighthouse. Workflow заранее вычитает находки, для которых уже есть открытое issue с меткой `lighthouse` и скрытым маркером `<!-- lighthouse-audit:<id> -->`, поэтому повторный запуск с той же находкой не создаёт дубль.
- **Агент:** получает prompt с путями к `/tmp/lighthouse-findings.json` (все находки) и `/tmp/lighthouse-new-findings.json` (только новые) и создаёт отдельное issue на каждую новую находку. Заголовок — `[Lighthouse] <id>: <title>`, метка — `lighthouse`.
- **Права и авторизация:** `contents: read` для checkout, `issues: write` для поиска дублей и создания issue, `id-token: write` для OIDC-обмена на scoped-токен OpenCode App — тот же способ, что и в остальных workflow. Модель — `deepseek/deepseek-flash`, ключ из секрета `OPENCODE_API_KEY`.
- **Ограничения агента:** файлы правит только в `/tmp`, из shell доступны только команды `gh`, запись в репозиторий, коммиты и push запрещены. Текст отчёта считается данными, а не инструкциями; `.env`-файлы не читаются.
- **Ручной запуск и результаты:** после переноса файла запуск делается из основной ветки: `Actions → OpenCode Lighthouse audit → Run workflow`. Успешный запуск оставляет артефакт `lighthouse-audit-<run_id>` с `report.json`, `report.html` и `agent-output.md`; вывод агента также виден в логе шага. Разбор проверен на реальном отчёте текущего production (Lighthouse 12.8.2, те же четыре категории): он выделил FCP, LCP, `meta-description` и `robots-txt`; фактические issue создаст первый запуск, потому что workflow-файл ещё не перенесён человеком.
- **Личные выводы:** агент хорошо подходит для рутинного разбора отчёта и оформления задач, но дедупликацию нельзя целиком отдавать модели. Поэтому workflow сам вычисляет дельту и маркеры, а агенту остаётся оформить текст issue. Слабое место — запуск и расписание невозможно включить из PR: нужен человек, который перенесёт файл в `.github/workflows/`.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
