# Desarrollo local

## Camino recomendado: Docker

1. Ejecuta `docker compose -f docker-compose.local.yml up --build` desde la raíz.
2. Abre `http://localhost:3000`.
3. Consulta la API en `http://localhost:8000/docs`.

El volumen `sos_postgres_local` es local. No uses `down -v` si deseas conservar sus datos.


## Frontend sin Docker

1. Instala Node.js 22 o superior.
2. Ejecuta `npm install` en la raíz.
3. Ejecuta `npm run dev`.
4. Abre la URL mostrada por Vite.

La aplicación usa datos de demostración y no requiere claves.

## Backend

1. Instala Python 3.12 y `uv`.
2. Ejecuta `uv sync --project apps/backend`.
3. Ejecuta `uv run --project apps/backend uvicorn src.main:app --reload`.
4. Consulta `/docs` para el contrato interactivo.

