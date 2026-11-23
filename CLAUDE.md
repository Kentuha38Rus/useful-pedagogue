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
docker compose run --rm backend npx sequelize-cli db:migrate
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

## Подводные камни

- API смонтирован на `/api`, а не `/api/v1`. Файлы в `docs/` устарели — источник правды по схеме БД и контрактам: код и `backend/migrations/`.
- Маршруты PWA лежат в `frontend/src/App.jsx`; `frontend/src/router/index.js` — заглушка. В `admin-panel` маршруты — в `src/router/index.jsx`.
- Мёртвые файлы, которые не нужно править: корневой `index.html`, `frontend/src/pages/Login/`, `frontend/src/pages/Auth/RegisterPage.jsx`. Живая страница входа — `frontend/src/pages/Auth/LoginPage.jsx`.
- Смешанные соглашения: таблицы `Users`, `Groups`, `Courses` (camelCase) и `messages`, `notifications`, `push_subscriptions`, `lesson_responses` (snake_case).
- `nginx/certs/renewal-hooks/deploy/fix-perms.sh` должен иметь mode `100755`; на Windows — `git update-index --chmod=+x`.

## Git и деплой

- Рабочая ветка — `prod-hardening`, после неё вливается в `main`.
- Сообщения коммитов — по-русски, коротко.
- Коммиты и пуши — только по явной просьбе.
- Пуш тега `v*` запускает деплой на прод (`.github/workflows/deploy.yml`).
- CI (`.github/workflows/ci.yml`) проверяет синтаксис backend, собирает `frontend` и `admin-panel`, плюс docker-образы; `landing` в CI не участвует.
- Сервер: проект в `/home/deploy/useful-pedagogue`.
- Ручное обновление сервера (только по явной просьбе): `git status` → `git pull origin prod-hardening` → `docker compose up -d --build`.
- На сервере не делать `git reset --hard`: локальные правки сохранять через `git stash`.
- После деплоя по тегу сервер может быть в detached HEAD — проверять `git branch --show-current`.
- Если менялись миграции — сначала `bash scripts/manual/backup.tool`, затем `docker compose run --rm backend npx sequelize-cli db:migrate`.
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
