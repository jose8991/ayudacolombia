# AGENTS.md — SOS Pereira Backend

## Stack

Python 3.12, FastAPI, Pydantic v2 y PostgreSQL/PostGIS.

## Arquitectura

- Los routers solo componen dependencias y contratos.
- La lógica vive en `domains/<dominio>/service.py`.
- La persistencia vive en repositorios; SQLAlchemy 2 usa `select()`.
- Toda mutación crítica es idempotente y auditable.
- Un reporte ciudadano siempre nace `reported`, nunca `verified` u `official`.

## Seguridad

- No exponer PII en respuestas públicas.
- Coordenadas sensibles se generalizan antes de publicarse.
- Redis acelera, pero PostgreSQL es la fuente de verdad.

## Docker

`docker compose up --build` desde esta carpeta expone la API en el puerto 8000.

