# Plan vivo de preparación para producción

Última actualización: 2026-08-14.

## Propósito

Este documento registra el trabajo necesario para llevar Ayuda Colombia a producción con los
estándares de TimeLiber. La evidencia detallada permanece en la
[auditoría de cumplimiento](standards-compliance-audit-2026-08-13.md). Una tarea sólo se marca
cerrada cuando tiene implementación, prueba, documentación y validación de despliegue.

## Estado actual

| Orden | Bloque | Estado | Criterio de cierre |
|---:|---|---|---|
| 1 | Arquitectura vertical backend | Cerrado | Routers de `identity`, `reports`, `needs` y `centers` sólo componen contratos y dependencias. |
| 2 | Tipado estricto backend | Cerrado | `mypy --strict` sin errores, Ruff y pruebas aprobados. |
| 3 | Idempotencia y protección contra abuso | Cerrado | Reintentos durables, conflicto por reutilización incorrecta y límites PostgreSQL para login/publicación. |
| 4 | Mutaciones con TanStack Query | Cerrado | Envíos y consulta de estado fuera de la página y administrados mediante la capa de datos. |
| 5 | Conectividad degradada segura | Cerrado | Cola AES-GCM por sesión, clave idempotente estable, reintento automático y descarte seguro de datos indescifrables. |
| 5.1 | Mantenibilidad frontend | En curso | Prettier y aduana de formato activos; encabezado, acciones y catálogo territorial extraídos. Faltan asistente y workspace del mapa para que `HomePage` quede bajo 200 líneas. |
| 6 | Accesibilidad automatizada | Parcial | axe pasa portada y recorridos; foco global corregido. Faltan navegador real, lector de pantalla y CI. |
| 7 | Presupuesto de rendimiento | Parcial | Build limita JS inicial a 100 KB gzip, CSS a 12 KB y mapa diferido a 300 KB. Falta Lighthouse móvil reproducible para LCP e INP. |
| 8 | Observabilidad completa | Parcial | Request ID y logs JSON ya existen; faltan métricas, alertas y trazas. |
| 9 | Migraciones y contratos en CI | Pendiente | Ciclo upgrade/downgrade/upgrade en PostgreSQL y detección de drift OpenAPI. |
| 10 | Documentación y ownership | Parcial | LICENSE (MIT), CONTRIBUTING y SECURITY publicados. Falta `llms-full.txt` y la aduana documental en CI. |
| 11 | Política de tratamiento de datos | Bloqueado por información | TIMELIBER S.A.S. debe aportar NIT, domicilio, dirección, teléfono, retención y revisión jurídica. |
| 12 | Repositorio Git canónico | Cerrado | Repositorio restaurado en `main` y publicado en `github.com/jose8991/ayudacolombia`. Falta CI. |
| 13 | Caducidad de la información | Cerrado | `is_stale` se calcula al leer con una ventana de 24 h; la interfaz muestra el tiempo transcurrido y advierte antes de desplazarse. |

## Evidencia del último corte

- Frontend: 55 pruebas, axe y presupuestos de build aprobados.
- Backend: 29 pruebas, Ruff y `mypy --strict` sobre 53 archivos aprobados.
- ESLint activo con las reglas oficiales de React Hooks: 0 errores. Quedan 16 avisos de
  complejidad y tamaño de archivo, que son la deuda del bloque 5.1 y se dejan visibles.
- Tipografía alojada en el propio dominio: ninguna llamada a servicios externos en el arranque.
- Base de datos: migración `0013_sufficient_items` aplicada y respaldo previo creado.
- Producción: frontend, backend y PostgreSQL saludables.
- API: `X-Request-ID` verificado desde el dominio público.

## Secuencia inmediata

1. Extraer el asistente de ayuda/publicación y el workspace cartográfico de `HomePage`.
2. Ejecutar Lighthouse móvil reproducible y prueba manual con lector de pantalla.
4. Incorporar métricas y trazas sin capturar PII.
5. Crear las aduanas CI de migraciones, OpenAPI y documentación.
6. Repetir la auditoría completa y desplegar únicamente con todas las pruebas aprobadas.

## Relevo para el siguiente desarrollador

El siguiente bloque autónomo es cerrar **5.1 Mantenibilidad frontend**. No requiere rediseñar la
experiencia ni cambiar contratos del backend. La jerarquía pública de tres acciones —“Necesito
ayuda”, “Quiero ayudar” y “Reportar”—, el mapa visible y la selección territorial deben conservarse.

### Punto de partida

- Componente por dividir: `apps/frontend/src/pages/home/HomePage.tsx` (1.443 líneas en este corte).
- Extracciones ya terminadas:
  - `apps/frontend/src/widgets/app-header/AppHeader.tsx`
  - `apps/frontend/src/widgets/home-primary-actions/HomePrimaryActions.tsx`
  - `apps/frontend/src/shared/api/neighborhoods.ts`
- Formato obligatorio: `apps/frontend/.prettierrc.json` y `npm run format:check`.
- Los datos del servidor continúan administrados con TanStack Query; no duplicarlos en estado local.

### Trabajo recomendado, en orden

1. Extraer el asistente de recorridos y formularios a un widget de `widgets/`, manteniendo en
   `features/` las mutaciones y reglas propias de cada caso de uso.
2. Extraer el workspace del mapa —mapa, filtros, leyenda, selección territorial y panel de
   resultados— sin volver ansiosa la carga de MapLibre ni del GeoJSON de barrios.
3. Dejar `HomePage` como composición de widgets, idealmente por debajo de 200 líneas.
4. Añadir o ajustar pruebas de los componentes extraídos, cubriendo al menos móvil, cambio entre
   Pereira y Dosquebradas, apertura del mapa y los tres recorridos principales.

### Criterios de aceptación

- No cambia el texto, orden ni comportamiento público sin una justificación de usabilidad.
- El selector permite volver de Dosquebradas a Pereira y sigue siendo operable en celular.
- El mapa se muestra y conserva su carga diferida; no aumenta los presupuestos de recursos.
- Ningún componente nuevo supera 200 líneas sin una justificación documentada.
- No se publican PII ni coordenadas exactas sensibles.
- Pasan formato, pruebas, accesibilidad y build con presupuesto antes de desplegar.

### Comandos de validación

Ejecutar desde la raíz del monorepo:

```bash
npm run format:check --workspace=@sos/frontend
npm run lint --workspace=@sos/frontend
npm run typecheck --workspace=@sos/frontend
npm test --workspace=@sos/frontend
npm run build --workspace=@sos/frontend
```

Después de pasar las aduanas, desplegar con Docker y confirmar que los tres servicios estén
saludables. No desplegar datos demostrativos como si fueran información real.

## Corte heurístico de usabilidad

Puntuación actual: **9/10**. No quedan hallazgos automáticos de severidad 3 o 4. Axe pasa la
portada y los recorridos “Necesito ayuda”, “Quiero ayudar” y “Reportar”. El foco visible cubre
botones, enlaces, campos, selectores y controles desplegables. La brecha de severidad 2 es la
validación en navegador real de contraste, zoom al 200/400 %, lector de pantalla, LCP e INP.

## Regla de actualización

Después de cada bloque se actualizan este plan y la auditoría. Los bloqueos externos se mantienen
visibles y nunca se convierten en supuestos ni datos inventados.
