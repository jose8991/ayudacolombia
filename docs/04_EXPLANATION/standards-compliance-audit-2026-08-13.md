# Auditoría de cumplimiento de estándares — 2026-08-13

## Alcance y fuentes

El orden de ejecución y los criterios de cierre se mantienen en el
[plan vivo de preparación para producción](production-readiness-plan.md).

Esta auditoría compara Ayuda Colombia con los estándares canónicos de
`timeliber-workspace/docs/standards`: frontend, backend, documentación, gestión de
información y topología. También aplica los `AGENTS.md` locales. La evidencia procede del
código, configuración, pruebas y despliegue actuales; una capacidad no demostrada se considera
pendiente.

## Veredicto

El sistema **no cumple todavía al 100 %**. Puede operar, pero la conformidad queda bloqueada por
los P0 y P1 siguientes. No debe presentarse como conforme hasta cerrar cada criterio y ejecutar
las aduanas completas.

## Matriz

| Área | Estado | Evidencia | Brecha / criterio de cierre |
|---|---|---|---|
| Capas frontend | Parcial | dirección de capas, TanStack Query, Prettier y widgets tipados | `HomePage` aún supera 200 líneas; extraer asistente y workspace cartográfico y añadir ESLint flat. |
| TypeScript estricto | Cumple | `tsc --noEmit` aprobado | Mantenerlo como bloqueo de CI. |
| Pruebas frontend | Parcial | 22 pruebas, incluida cola cifrada y axe en recorridos principales | Añadir navegador real y recorrido completo de reintento a CI. |
| Accesibilidad | Parcial | axe sin violaciones automáticas, foco global, Escape, objetivos táctiles y alternativa textual | Validar contraste, zoom y lector de pantalla en navegador real y CI. |
| Rendimiento frontend | Parcial | build impone 100 KB JS inicial, 12 KB CSS y 300 KB mapa diferido, todo gzip | Medir Lighthouse móvil reproducible y fijar límites LCP/INP. |
| Backend vertical | Cumple | `identity`, `reports`, `needs` y `centers` usan servicios, repositorios y excepciones de dominio | Mantener routers limitados a composición y contratos. |
| Tipado backend | Cumple | `mypy --strict` aprobado en 51 archivos y Ruff aprobado | Mantener ambas aduanas como bloqueo de CI. |
| Contrato OpenAPI | Parcial | `docs/03_REFERENCE/openapi.json` se genera desde FastAPI | CI debe regenerar y fallar ante drift no revisado; generar también referencia humana de endpoints. |
| Privacidad y PII | Parcial | cifrado de contacto, generalización pública y evidencia de autorización | Completar NIT, domicilio, dirección, teléfono y retención en la política; revisión jurídica. |
| Idempotencia y abuso | Cumple | claves obligatorias persistidas por hash; reintentos devuelven el mismo comprobante; límites PostgreSQL para login y publicación | Añadir limpieza programada de ventanas antiguas y monitorear umbrales. |
| Observabilidad | Parcial | request ID, encabezado de correlación y logs HTTP JSON sin cuerpos ni PII | Añadir métricas y trazas OpenTelemetry. |
| Migraciones | Parcial | Alembic y backup previo al despliegue | Probar upgrade/downgrade/upgrade contra PostgreSQL real en CI. |
| Docker | Cumple parcialmente | builds multietapa; backend no-root; health checks | Verificar usuario no-root del frontend y escaneo de imágenes en CI. |
| Seguridad HTTP | Cumple | CSP, HSTS, `nosniff`, `DENY`, Referrer-Policy y Permissions-Policy verificados en producción | Mantener prueba automatizada de encabezados. |
| Documentación Diátaxis | Parcial | cuatro cuadrantes y ADR | Añadir CONTRIBUTING, CI documental, `llms-full.txt` autogenerado y ownership mecánico. |
| Control de versiones | No verificable | el directorio de trabajo no contiene metadatos `.git` utilizables | Restaurar/identificar el repositorio Git para poder auditar drift, commits y CI. |
| Topología | Parcial | catálogos Backstage co-localizados | Generar endpoints desde OpenAPI y conectar topología/contrato en CI. |
| Conectividad degradada | Cumple | outbox AES-GCM, clave sólo de sesión, idempotencia y reintento al evento `online` | Mantener pruebas de cifrado, recuperación y descarte seguro. |

## Prioridad obligatoria

### P0 — antes de afirmar conformidad

1. Completar datos legales y revisión de la política de tratamiento.
2. Restaurar o identificar el repositorio Git canónico del proyecto.

### P1 — antes de escalar operación

1. Tests de integración con PostgreSQL real y ciclo de migraciones.
2. Métricas y trazas OpenTelemetry.
3. Pruebas WCAG automatizadas y presupuesto Lighthouse móvil.
4. Documentación y OpenAPI regenerados y verificados por CI.

## Aduanas ejecutadas

- Ruff: aprobado.
- TypeScript `tsc --noEmit`: aprobado.
- Vitest: 22 pruebas aprobadas, incluidas comprobaciones axe.
- Presupuesto frontend: 87,9 KB JS inicial, 7,6 KB CSS inicial y 277,9 KB mapa diferido, todos gzip.
- Build Vite: aprobado.
- Pytest: 21 pruebas aprobadas.
- Docker frontend/backend: construidos y saludables en producción.
- `mypy --strict`: aprobado sin errores en 51 archivos.
- `npm audit`: no concluyente por indisponibilidad de red; no se marca aprobado.

## Regla de actualización

Cada cierre debe incluir código, prueba, documentación asociada y evidencia de la aduana. Este
documento registra cumplimiento; no reemplaza los estándares canónicos ni debe duplicar sus
explicaciones.
