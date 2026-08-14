# Ayuda Colombia

Plataforma web humanitaria para consultar y reportar necesidades, ayudas, centros y afectaciones territoriales durante una emergencia.

## Inicio rápido con Docker

```bash
docker compose -f docker-compose.local.yml up --build
```

Abre `http://localhost:3000`; la API queda en `http://localhost:8000/docs`.

La información pública proviene de la API y distingue fuentes oficiales, información verificada y avisos comunitarios sin confirmar. Consulta la [arquitectura](docs/04_EXPLANATION/architecture.md), el [inicio local](docs/01_TUTORIALS/local-development.md), las [fuentes oficiales y líneas de atención](docs/03_REFERENCE/fuentes-oficiales.md), el [plan de preparación para producción](docs/04_EXPLANATION/production-readiness-plan.md) y la [auditoría de estándares](docs/04_EXPLANATION/standards-compliance-audit-2026-08-13.md).
