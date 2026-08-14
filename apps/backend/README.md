# Ayuda Colombia Backend

API FastAPI para coordinación, confianza y publicación territorial.

## Desarrollo

```bash
uv sync --group dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Pruebas y calidad:

```bash
uv run pytest -q
uv run ruff check app tests
```

La arquitectura y reglas humanitarias están en
[la explicación del sistema](../../docs/04_EXPLANATION/architecture.md). El contrato HTTP se
genera en [OpenAPI](../../docs/03_REFERENCE/openapi.json).
