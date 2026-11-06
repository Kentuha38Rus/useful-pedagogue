#!/usr/bin/env bash
set -euo pipefail

# Папка для бэкапов (можно изменить)
BACKUP_DIR="${BACKUP_DIR:-/opt/useful-pedagogue/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
TS="$(date +%Y%m%d_%H%M%S)"
DB_NAME="${DB_NAME:-useful_pedagogue}"

mkdir -p "$BACKUP_DIR"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] [backup] start $TS"

# 1. Бэкап Postgres (используем docker compose)
docker compose exec -T postgres pg_dump -U "${DB_USER:-pedagogue}" -d "$DB_NAME" -Fc \
  > "$BACKUP_DIR/db_${DB_NAME}_${TS}.dump"

# 2. Бэкап Redis (сохраняем текущее состояние)
docker compose exec -T redis redis-cli SAVE > /dev/null
docker compose cp redis:/data/dump.rdb "$BACKUP_DIR/redis_${TS}.rdb"

# 3. Удаление старых бэкапов (старше KEEP_DAYS)
find "$BACKUP_DIR" -name "db_*.dump"  -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +"$KEEP_DAYS" -delete

echo "[$(date +'%Y-%m-%d %H:%M:%S')] [backup] done $TS"
ls -lh "$BACKUP_DIR" | tail -5
