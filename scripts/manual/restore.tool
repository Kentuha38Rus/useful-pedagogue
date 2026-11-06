#!/usr/bin/env bash
set -euo pipefail

if [ -z "$1" ]; then
  echo "Использование: $0 <путь_к_файлу_бэкапа.dump>"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-useful_pedagogue}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Ошибка: Файл $BACKUP_FILE не найден."
  exit 1
fi

echo "⚠️  ВНИМАНИЕ: Это перезапишет текущую базу данных '$DB_NAME'!"
read -p "Вы уверены, что хотите продолжить? (y/N): " confirm
if [[ "$confirm" != [yY] && "$confirm" != [yY][eE][sS] ]]; then
  echo "Отменено."
  exit 0
fi

echo "[restore] Восстановление из $BACKUP_FILE..."
docker compose exec -T postgres dropdb -U "${DB_USER:-pedagogue}" --if-exists "$DB_NAME"
docker compose exec -T postgres createdb -U "${DB_USER:-pedagogue}" "$DB_NAME"

# Восстанавливаем данные
docker compose exec -T postgres pg_restore -U "${DB_USER:-pedagogue}" -d "$DB_NAME" < "$BACKUP_FILE"

echo "[restore] База данных '$DB_NAME' успешно восстановлена."
