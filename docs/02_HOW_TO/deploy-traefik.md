# Publicar SOS con el Traefik compartido de TimeLiber

## 1. DNS

En el proveedor DNS de `timeliber.com.co`, crear:

| Tipo | Nombre | Valor | TTL |
| --- | --- | --- | --- |
| A | `sos` | IP pública IPv4 del servidor Traefik | 300 o Automático |

Si el proveedor pide el nombre completo, usar `ayudacolombia.com.co`. No crear un registro AAAA salvo que el servidor reciba tráfico IPv6 en 80/443.

Verificar antes del despliegue:

```bash
dig +short ayudacolombia.com.co A
```

Debe devolver la misma IP pública que usan los demás subdominios de TimeLiber.

## 2. Secretos

```bash
cp .env.prod.example .env.prod
openssl rand -base64 48
```

Generar un valor distinto para `SOS_DB_PASSWORD`, `SOS_JWT_SECRET` y `SOS_DATA_ENCRYPTION_KEY`. No reutilizar los valores locales ni subir `.env.prod` al repositorio.

## 3. Validar y desplegar

```bash
docker network inspect proxy-net >/dev/null
docker compose --env-file .env.prod -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Traefik descubre ambos contenedores mediante labels. `/api/*` va al backend con prioridad 100; el resto va al frontend. Traefik emite y renueva el certificado TLS con el resolver `letsencrypt`.

## 4. Comprobar

```bash
curl -fsS https://ayudacolombia.com.co/health
curl -fsS https://ayudacolombia.com.co/api/v1/health/live
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

No se publican 80, 443, 8000, 3000 ni PostgreSQL en el host. Traefik es el único punto de entrada público por la red externa `proxy-net`.
