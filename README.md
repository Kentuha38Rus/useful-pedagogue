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