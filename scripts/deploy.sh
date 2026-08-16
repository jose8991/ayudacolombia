#!/usr/bin/env bash
# Despliegue de producción, de principio a fin.
#
# Existe porque desplegar a mano se rompió dos veces por una razón tonta: el directorio de
# trabajo. El guion se sitúa solo, respalda antes de tocar nada, construye, levanta y
# comprueba que el servicio quedó vivo. Si algo falla, se detiene ahí.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"
COMPOSE=(docker compose --env-file "$REPO/.env.prod" -f "$REPO/docker-compose.prod.yml")
DOMINIO="${SOS_PUBLIC_DOMAIN:-ayudacolombia.com.co}"

paso() { printf '\n== %s\n' "$1"; }

paso 'Cambios sin comprometer'
if [ -n "$(git status --porcelain)" ]; then
  echo 'Hay cambios sin comprometer. Despliegas algo que no está en el historial:'
  git status --short
  read -r -p '¿Continuar de todos modos? [s/N] ' respuesta
  [ "$respuesta" = 's' ] || exit 1
fi

paso 'Respaldo previo'
"$REPO/scripts/backup.sh"

paso 'Construcción y arranque'
"${COMPOSE[@]}" up -d --build

paso 'Esperando a que responda'
for intento in $(seq 1 30); do
  # Mientras nginx arranca responde 404 unos segundos; ese ruido no es un problema.
  if curl -fsS -o /dev/null "https://$DOMINIO/health" 2>/dev/null \
    && curl -fsS -o /dev/null "https://$DOMINIO/api/v1/health/live" 2>/dev/null; then
    echo "Portada y API responden (intento $intento)."
    break
  fi
  if [ "$intento" -eq 30 ]; then
    echo 'El servicio no respondió a tiempo. Estado de los contenedores:' >&2
    "${COMPOSE[@]}" ps
    exit 1
  fi
  sleep 2
done

paso 'Estado final'
"${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}'
echo
echo "Listo. Si algo salió mal, el respaldo más reciente está en ${SOS_BACKUP_DIR:-$HOME/sos-backups}."
