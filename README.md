@'
# Полезный педагог

Экосистема для детского центра: PWA-приложение для родителей и педагогов, админ-панель, REST API + WebSocket.

## Архитектура

| Сервис | Технологии | Порт |
|---|---|---|
| `frontend` | React 18 + Vite + Redux + PWA | 80 (внутри) |
| `admin-panel` | React 18 + Vite + Redux | 80 (внутри) |
| `backend` | Node 20 + Express + Sequelize + Socket.IO | 5000 |
| `postgres` | PostgreSQL 15 | 5432 (внутри) |
| `redis` | Redis 7 | 6379 (внутри) |
| `nginx` | reverse proxy + SSL | 80/443 |

## Локальный запуск (dev)

1. Скопируйте переменные окружения:
   ```bash
   cp .env.example .env

Запись от 25.10.2026
Миграции: под pedagogue (owner, DDL)
Runtime:  под app_user (RLS)
Cron:     под app_user, tenant_id явно в where (permissive RLS)
Platform: runWithTenant(null, ...) — permissive, видит всё
Tenant:   runWithTenant(req.tenantId, ...) — RLS + явный where
Новый контроллер: обязательно where: { tenantId: req.tenantId }
Новый сервис:     tenantId в аргументах (не из ALS)
Новый job:        явный tenant_id в каждом where