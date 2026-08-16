#!/usr/bin/env bash
# Respaldo de la base de datos de producción.
#
# Pensado para correr solo desde cron. Guarda un volcado comprimido, verifica que no esté
# corrupto y conserva los últimos catorce días: un respaldo que nadie comprueba no es un
# respaldo, y uno que crece sin límite termina llenando el disco que intenta proteger.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="${SOS_BACKUP_DIR:-$HOME/sos-backups}"
RETENCION_DIAS="${SOS_BACKUP_RETENTION_DAYS:-14}"
COMPOSE=(docker compose --env-file "$REPO/.env.prod" -f "$REPO/docker-compose.prod.yml")

mkdir -p "$DESTINO"
archivo="$DESTINO/sos-$(date +%Y%m%d-%H%M%S).sql.gz"

"${COMPOSE[@]}" exec -T database pg_dump -U "${SOS_DB_USER:-sos}" -d "${SOS_DB_NAME:-sos}" \
  | gzip > "$archivo"

if ! gzip -t "$archivo"; then
  echo "El respaldo salió corrupto: $archivo" >&2
  rm -f "$archivo"
  exit 1
fi

# Un volcado sano de esta base pesa varios kilobytes; uno diminuto significa que algo falló.
tamano=$(stat -c %s "$archivo")
if [ "$tamano" -lt 2000 ]; then
  echo "El respaldo pesa $tamano bytes, demasiado poco: se descarta." >&2
  rm -f "$archivo"
  exit 1
fi

find "$DESTINO" -name 'sos-*.sql.gz' -mtime "+$RETENCION_DIAS" -delete
echo "Respaldo correcto: $archivo ($tamano bytes)"
