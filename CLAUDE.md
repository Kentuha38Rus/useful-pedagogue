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

`backend` содержит разрушительный скрипт `npm run clear:courses` (удаляет курсы и занятия). Сначала всегда `npm run clear:courses:dry`.

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

## Подводные камни

- API смонтирован на `/api`, а не `/api/v1`. Файлы в `docs/` устарели — источник правды по схеме БД и контрактам: код и `backend/migrations/`.
- Маршруты PWA лежат в `frontend/src/App.jsx`; `frontend/src/router/index.js` — заглушка. В `admin-panel` маршруты — в `src/router/index.jsx`.
- Мёртвые файлы, которые не нужно править: корневой `index.html`, `frontend/src/pages/Login/`, `frontend/src/pages/Auth/RegisterPage.jsx`. Живая страница входа — `frontend/src/pages/Auth/LoginPage.jsx`.
- Смешанные соглашения: таблицы `Users`, `Groups`, `Courses` (camelCase) и `messages`, `notifications`, `push_subscriptions`, `lesson_responses` (snake_case).

## Git и деплой

- Рабочая ветка — `prod-hardening`, после неё вливается в `main`.
- Сообщения коммитов — по-русски, коротко.
- Коммиты и пуши — только по явной просьбе.
- Пуш тега `v*` запускает деплой на прод (`.github/workflows/deploy.yml`).
- CI (`.github/workflows/ci.yml`) проверяет синтаксис backend, собирает `frontend` и `admin-panel`, плюс docker-образы; `landing` в CI не участвует.

## Секреты

`.env` содержит реальные секреты — не читать и не выводить. В git попадает только `.env.example` с заглушками.
