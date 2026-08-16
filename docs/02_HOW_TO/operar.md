# Operar Ayuda Colombia

Lo que hay que saber para mantener el servicio vivo sin depender de quien lo construyó.

## Desplegar un cambio

```bash
./scripts/deploy.sh
```

Respalda, construye, levanta y comprueba que el dominio responda antes de darse por
terminado. Si algo falla, se detiene ahí y muestra el estado de los contenedores.

Avisa si hay cambios sin comprometer: desplegar algo que no está en el historial es la
forma más rápida de no poder volver atrás.

No hace falta situarse en ninguna carpeta: el guion se ubica solo. Esa fue justamente la
causa de dos despliegues fallidos el 14 de agosto.

## Respaldos

Corren solos a las 3:30 cada día mediante un temporizador de systemd:

```bash
systemctl list-timers sos-backup.timer      # cuándo es el próximo
journalctl -u sos-backup.service -n 20      # cómo fue el último
./scripts/backup.sh                         # forzar uno ahora
```

Se guardan en `~/sos-backups` y se conservan catorce días. El guion **verifica el archivo
y lo descarta si sale corrupto o sospechosamente pequeño**, para no acumular respaldos que
no sirven. Si el volcado sale vacío el servicio falla a propósito.

### Restaurar

```bash
gunzip -c ~/sos-backups/sos-AAAAMMDD-HHMMSS.sql.gz \
  | docker compose --env-file .env.prod -f docker-compose.prod.yml \
    exec -T database psql -U sos -d sos
```

## Comprobar que está vivo

```bash
curl -fsS https://ayudacolombia.com.co/health
curl -fsS https://ayudacolombia.com.co/api/v1/health/live
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

## Cargar o actualizar albergues y puntos de acopio

El archivo de datos vive en el repositorio con la fuente de cada punto:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend \
  python -m app.cli.load_official_centers data/official-centers-2026-08-14.json
```

Es idempotente por territorio y nombre: se puede repetir sin duplicar. Las reglas para
añadir un punto están en [CONTRIBUTING.md](../../CONTRIBUTING.md) y **no se negocian**:
ninguna coordenada se adivina y `official` es solo para lo que publicó la entidad.

## Revisar lo que envía la ciudadanía

En `/coordina`, con una cuenta que tenga permiso de verificación en ese territorio. Ahí se
ve lo pendiente, el teléfono privado de quien publicó, y los botones para llamar, abrir
WhatsApp y marcar que ya se contactó.

**Sin alguien haciendo esto, los tres niveles de verificación no existen en la práctica**:
todo lo que envía la gente se queda en "sin confirmar".

## Qué se rompe solo con el tiempo

- **La información caduca a las 72 horas.** Pasado ese plazo cada ficha avisa que puede
  estar desactualizada. Es correcto, pero significa que sin reconfirmar en terreno el mapa
  entero termina marcado, y un aviso que sale en todas partes deja de leerse.
- **Las publicaciones de un centro vencen** cuando se cumple el plazo que eligió quien
  publicó, y la ficha vuelve a mostrar lo que el centro tiene de base.
- **El certificado TLS** lo renueva Traefik solo.

## Límites conocidos

- No hay métricas ni alertas: si el servicio se cae de madrugada, nadie se entera hasta
  que alguien intente usarlo. Los contenedores sí se reinician solos si mueren.
- La política de tratamiento de datos está incompleta (bloque 11 del
  [plan](../04_EXPLANATION/production-readiness-plan.md)) y la aplicación recoge teléfonos.
  Es el único bloqueo con consecuencias legales.
