# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Мультитенантная экосистема детского центра: PWA (`frontend/`), админка школы (`admin-panel/`), лендинг (`landing/`) и общий REST/WebSocket API (`backend/`). Запуск — Docker Compose, наружу смотрит `nginx`. `frontend/`, `admin-panel/`, `landing/`, `backend/` — отдельные приложения; свои `CLAUDE.md` в подкаталогах подхватываются автоматически.

## Команды

Корневого `package.json` и workspaces нет — `npm` запускается внутри каждого приложения.

```bash
# Весь стек (нужен заполненный .env; шаблон — .env.example)
docker compose up -d --build

# Локальная разработка
cd backend && npm run dev        # :5000
cd frontend && npm run dev       # :5173, проксирует /api и /socket.io на :5000
cd admin-panel && npm run dev    # :3001
cd landing && npm run dev        # :5174

# Сборка
cd frontend && npm run build
cd admin-panel && npm run build
cd landing && npm run build

# Линт есть только у frontend. Локально он строгий (--max-warnings 0),
# в CI запускается с `|| true` и не блокирует сборку.
cd frontend && npm run lint

# Миграции — только с явного разрешения владельца
docker compose run --rm backend node node_modules/sequelize-cli/lib/sequelize db:migrate

# Проверить, какие миграции применены
docker compose run --rm backend node node_modules/sequelize-cli/lib/sequelize db:migrate:status
```

Тестов в проекте нет — `npm test` не существует.

`backend` содержит разрушительные скрипты. Порядок всегда такой: сначала `--dry-run`, потом удаление.

- `npm run clear:courses:dry` → `npm run clear:courses` — курсы, группы, занятия, посещаемость;
- `node src/scripts/reset-tenants.js --dry-run` → `--yes` — полная очистка базы: все пользователи, кроме `platform_admin`, все тенанты, кроме `default`. Одна транзакция, при несовпадении контрольных счётчиков — откат. На проде требует `ALLOW_DANGEROUS_SCRIPTS=1`.

Правило для новых разрушительных скриптов: `--dry-run`, обязательный `--yes`, отказ при `NODE_ENV=production` без `ALLOW_DANGEROUS_SCRIPTS=1`, всё в одной транзакции и проверка счётчиков до `COMMIT`.

## Мультитенантность — главное правило

Каждый запрос к данным тенанта обязан фильтроваться по тенанту:

- в контроллерах — `where: { tenantId: req.tenantId }`;
- в таблицах `messages`, `notifications`, `push_subscriptions`, `lesson_responses` колонка называется `tenant_id` — фильтр по ней;
- сервисы получают `tenantId` аргументом, а не берут из AsyncLocalStorage;
- cron-джобы работают вне ALS — в каждом `where` должен быть явный `tenant_id`.

RLS включается только внутри `sequelize.transaction()` (`SET LOCAL app.tenant_id`). Запросы вне транзакций защищены только явными `where`: забытый фильтр = утечка между школами.

`platform_admin` живёт без тенанта; имперсонация — заголовок `X-Tenant-Id`, тогда `req.effectiveRole = 'admin'`. `/api/platform/*` проверяет реальную роль через `requirePlatformAdmin`. Регистрация требует `tenantSlug`.

## Авторизация

- Access-токен — JWT в `localStorage` (`token`), 15 минут.
- Refresh-токен — JWT в httpOnly cookie `refreshToken`, 7 дней; ротация при каждом refresh + денлист в Redis (`bl:<jti>`).
- Оба фронтенда (`frontend`, `admin-panel`) уже работают через cookie: `withCredentials: true`, тихий refresh при 401. Не возвращай `refreshToken` в `localStorage`.
- `backend/src/app.js` должен подключать `cookieParser()` — иначе refresh-cookie не читается.

## PWA, service worker и push

- После выкладки PWA обновляется не сразу: пользователю нужно закрыть и открыть приложение (на компьютере — Ctrl+F5). Старый service worker может продолжать отдавать кэш.
- `admin-panel/public/service-worker.js` не удалять — это «файл-убийца» устаревшего service worker PWA на домене админки.
- Все запросы уведомлений (`subscribe`, `unsubscribe`) должны идти через общий `frontend/src/utils/api.js`, а не через сырой `fetch`: иначе при истёкшем access-токене нет refresh и приходит 401.
- VAPID-ключ перед подпиской конвертируется в `Uint8Array` (`urlBase64ToUint8Array`) — иначе Safari/iOS не подписывается.
- На iPhone push работают только с **iOS 16.4+** и только в приложении, добавленном на экран «Домой». На более старых iOS системных уведомлений от PWA быть не может.
- Переключатель уведомлений хранит выбор в `localStorage` (`pushEnabled`), при выключении снимает подписку на сервере и блокирует всплывающие уведомления от socket.

## Чаты и сокет

- Отправка сообщений идёт через `POST /api/messages`; сервер сохраняет сообщение и рассылает `new_message` в объединение комнат `chat_<id>` и `user:<id>`.
- Сокет после фона/сна переподключается с актуальным токеном (`ensureSocketConnected` в `frontend/src/utils/socket.js`); access-токен живёт 15 минут, старый токен при reconnect не проходит.
- `ChatWindow` подписывается на комнату (`join_chat`), а при отсутствии сокета раз в 10 секунд подтягивает историю; список диалогов обновляется раз в 15 секунд.
- Сообщения дедуплицируются по `id`: одно и то же может прийти и по REST, и по сокету. Не добавлять «оптимистичные» сообщения без такой дедупликации — при смене чата они исчезают.
- Для iPhone polling — страховка от «полуживого» сокета; не убирать его, не предложив другую гарантию доставки.

## Группы, замены и конфликты

- Название группы уникально в тенанте без учёта регистра; проверка — `Op.iLike` в `adminController`.
- При создании/изменении группы проверяются: пересечение расписания преподавателя, пересечение с уже созданными занятиями (включая разовые замены), накладки у детей при смене расписания, лимит детей.
- При добавлении ребёнка проверяются его другие группы и лимит группы.
- `Lessons.substituteTeacherId` — замена преподавателя на конкретное занятие. Фактический преподаватель: `substituteTeacher || group.teacher`; уведомления, статистика и зарплата должны использовать фактического.
- Ошибки конфликтов возвращаются как 409 с русским `message`; админка показывает их в форме, а не глухим `alert`.

## Даты и время

- Сервер в UTC, пользователи в Иркутске (+8). Для «сегодня/завтра», недели и календаря использовать локальную дату, а не `toISOString().slice(0,10)`.
- Даты занятий в БД — `DATEONLY` (строки `YYYY-MM-DD`); не преобразовывать их через `new Date()` без явного часового пояса.

## Подводные камни

- API смонтирован на `/api`, а не `/api/v1`. Файлы в `docs/` устарели — источник правды по схеме БД и контрактам: код и `backend/migrations/`.
- Маршруты PWA лежат в `frontend/src/App.jsx`; `frontend/src/router/index.js` — заглушка. В `admin-panel` маршруты — в `src/router/index.jsx`.
- Мёртвые файлы, которые не нужно править: корневой `index.html`, `frontend/src/pages/Login/`, `frontend/src/pages/Auth/RegisterPage.jsx`. Живая страница входа — `frontend/src/pages/Auth/LoginPage.jsx`.
- Смешанные соглашения: таблицы `Users`, `Groups`, `Courses` (camelCase) и `messages`, `notifications`, `push_subscriptions`, `lesson_responses` (snake_case).
- `nginx/certs/renewal-hooks/deploy/fix-perms.sh` должен иметь mode `100755`; на Windows — `git update-index --chmod=+x`.
- `admin-panel/public/service-worker.js` не удалять: это «файл-убийца» для устаревшего service worker от PWA. Если домены перепутаны и админка временно отдаёт личный кабинет, PWA регистрирует service worker на домене админки и после исправления маршрутизации продолжает показывать личный кабинет из кэша. Файл снимает такую регистрацию и чистит кэши.
- После успешного/неуспешного входа и выхода обязательно сбрасывать `loading` в `frontend/src/store/slices/authSlice.js`, иначе остаётся вечный экран «Загрузка...».
- Родитель не может создавать, редактировать и удалять детей — только администратор (`childController`).
- Не переводить nginx на динамический `resolver 127.0.0.11` с `proxy_pass` через переменные: на этом сервере такая схема уже давала 502 на всех доменах. Рабочая схема — статический `proxy_pass` + обязательный `nginx -s reload` после пересборки контейнеров.

## Git и деплой

- Рабочая ветка — `prod-hardening`, после неё вливается в `main`.
- Сообщения коммитов — по-русски, коротко.
- Коммиты и пуши — только по явной просьбе.
- Пуш тега `v*` запускает деплой на прод (`.github/workflows/deploy.yml`).
- CI (`.github/workflows/ci.yml`) проверяет синтаксис backend, собирает `frontend` и `admin-panel`, плюс docker-образы; `landing` в CI не участвует.
- Сервер: проект в `/home/deploy/useful-pedagogue`.
- Ручное обновление сервера (только по явной просьбе): `git status` → `git pull origin prod-hardening`.
- Если менялись миграции: `bash scripts/manual/backup.tool` → `docker compose build backend` → `docker compose run --rm backend node node_modules/sequelize-cli/lib/sequelize db:migrate`, и только после этого поднимать новый backend.
- Затем: `docker compose build admin-panel frontend` → `docker compose up -d backend admin-panel frontend` → `docker compose exec nginx nginx -t` → `docker compose exec nginx nginx -s reload`.
- nginx резолвит имена контейнеров один раз при старте/перезагрузке и кэширует их IP. После пересборки `frontend`, `admin-panel` или `backend` обязательно перезагружать nginx (`nginx -s reload`), иначе домены могут начать отдавать чужое приложение, 502 или вообще «не пускать» на сайт. В `.github/workflows/deploy.yml` этот шаг выполняется автоматически.
- Если после пересборки сайт перестал открываться или отдаёт 502 — сначала `docker compose restart nginx`, это самая частая причина.
- Не переводить nginx на динамический `resolver 127.0.0.11` и `proxy_pass` через переменные: на этом сервере такая схема уже давала 502 на всех доменах. Рабочая схема — статический `proxy_pass` + обязательный reload.
- На сервере не делать `git reset --hard`: локальные правки сохранять через `git stash`.
- После деплоя по тегу сервер может быть в detached HEAD — проверять `git branch --show-current`.
- В `deploy.yml` миграции идут до `up -d`, а nginx перезагружается после запуска сервисов — этот порядок не менять.
- `sequelize-cli` теперь в `dependencies` production-образа: запускать через `node node_modules/sequelize-cli/lib/sequelize`, `npx` не нужен.
- `docker compose down -v` удаляет данные — не использовать.

## Обслуживание на сервере

- Бэкап: `bash scripts/manual/backup.tool` — дампы кладутся в `/home/deploy/backups` (переопределяется через `BACKUP_DIR`; путь `/opt/useful-pedagogue/backups` пользователю `deploy` недоступен).
- Проверка дампа без восстановления: `docker compose exec -T postgres pg_restore -l < <дамп> | head`.
- Восстановление: `bash scripts/manual/restore.tool <дамп>` — скрипт сам останавливает `backend` перед `dropdb` и запускает обратно; без остановки живые подключения держат базу и `dropdb` не проходит.
- Одноразовый скрипт из `backend/src/scripts/` не попадёт в контейнер до пересборки образа (bind-mount нет, backend `read_only`). Запуск без пересборки:

  ```bash
  docker compose run --rm \
    -v "$PWD/backend/src/scripts:/app/src/scripts:ro" \
    -e ALLOW_DANGEROUS_SCRIPTS=1 \
    backend node src/scripts/<имя>.js --dry-run
  ```

  Если mount не сработал — `docker compose build backend`, затем та же команда без `-v`.

## Секреты

`.env` содержит реальные секреты — не читать и не выводить. В git попадает только `.env.example` с заглушками.
