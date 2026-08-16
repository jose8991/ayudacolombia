# Plan vivo de preparación para producción

Última actualización: 2026-08-15.

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
| 5.1 | Mantenibilidad frontend | Parcial | `HomePage` pasó de 1.485 a 265 líneas y de complejidad 155 a 19. El panel de recorridos, el formulario, el workspace del mapa y la bandeja de revisión viven en widgets propios. Queda `EmergencyMap` en 700 líneas. |
| 6 | Accesibilidad automatizada | Cerrado | axe pasa portada y recorridos en cada push. Auditado además en navegador real contra producción con contraste activo: 0 violaciones en móvil (con y sin mapa) y escritorio. Queda pendiente una prueba manual con lector de pantalla. |
| 7 | Presupuesto de rendimiento | Cerrado | Build limita JS inicial a 100 KB gzip, CSS a 12 KB y mapa diferido a 300 KB. Lighthouse móvil sobre producción: rendimiento 99, bloqueo total 74 ms, interactivo 1,9 s, LCP 1,7 s, CLS 0,026 (mediana de tres corridas). |
| 8 | Observabilidad completa | Parcial | Request ID y logs JSON ya existen; respaldo diario verificado por systemd. Faltan métricas, alertas y trazas. |
| 9 | Migraciones y contratos en CI | Cerrado | GitHub Actions ejecuta el ciclo upgrade/downgrade/upgrade sobre PostGIS y falla si el contrato OpenAPI se desvía del código. |
| 10 | Documentación y ownership | Parcial | LICENSE (MIT), CONTRIBUTING y SECURITY publicados. Falta `llms-full.txt`. |
| 11 | Política de tratamiento de datos | Bloqueado por información | TIMELIBER S.A.S. debe aportar NIT, domicilio, dirección, teléfono, retención y revisión jurídica. |
| 12 | Repositorio Git canónico | Cerrado | Repositorio restaurado en `main`, publicado en `github.com/jose8991/ayudacolombia` y con aduanas en cada push. |
| 13 | Caducidad de la información | Cerrado | `is_stale` se calcula al leer con una ventana de 72 h; la interfaz muestra siempre el tiempo transcurrido y advierte antes de desplazarse. |
| 14 | Operación sin el autor | Cerrado | `scripts/deploy.sh` y `scripts/backup.sh`, respaldo diario por systemd con verificación, y manual en `docs/02_HOW_TO/operar.md`. |

## Evidencia del último corte

- Integración continua: formato, ESLint, tipos, pruebas y presupuestos de peso en cada push,
  más el ciclo de migraciones y la detección de deriva del contrato.
- Frontend: 79 pruebas, axe y presupuestos de build aprobados.
- Backend: 30 pruebas, Ruff y `mypy --strict` sobre 53 archivos aprobados.
- ESLint activo con las reglas oficiales de React Hooks: 0 errores. Los avisos que quedan son
  de complejidad y tamaño en cinco archivos, deuda del bloque 5.1, y se dejan visibles.
- Piezas sin acoplamiento al dominio extraídas a `packages/kit`: marcadores de mapa, cola
  cifrada, geometría de polígonos, formatos de tiempo y distancia, y generador de iconos.
- Tipografía alojada en el propio dominio: ninguna llamada a servicios externos en el arranque.
- Base de datos: migración `0014_report_contacted` aplicada y respaldo previo creado. El ciclo
  completo de subida y bajada se verifica en CI sobre PostGIS.
- Producción: frontend, backend y PostgreSQL saludables.
- API: `X-Request-ID` verificado desde el dominio público.

## Secuencia inmediata

1. Desbloquear el bloque 11: sin política de tratamiento completa no debería seguir
   recogiéndose ningún teléfono.
2. Probar la aplicación con una persona real en un celular real.
3. Ejecutar Lighthouse móvil reproducible y prueba manual con lector de pantalla.
4. Incorporar métricas y trazas sin capturar PII.
5. Repetir la auditoría completa y desplegar únicamente con todas las aduanas aprobadas.

## Relevo para el siguiente desarrollador

Lo que queda de mantenibilidad es `apps/frontend/src/widgets/emergency-map/EmergencyMap.tsx`,
en unas 700 líneas. Se intentó separar sus capas de límites y **no hay un corte limpio**: el
bloque que las arma cierra sobre props que cambian en el tiempo —`selectedArea`,
`selectedNeighborhood`—, así que extraerlo obliga a introducir referencias mutables para
sincronizar estado. Sería añadir complejidad para bajar un aviso de complejidad. Si se
intenta de nuevo, hay que resolver antes esa sincronización, no moverlo tal cual.

El resto de componentes están entre 260 y 560 líneas y cada uno hace una sola cosa.

### Criterios de aceptación

- No cambia el texto, orden ni comportamiento público sin una justificación de usabilidad.
- El selector permite volver de Dosquebradas a Pereira y sigue siendo operable en celular.
- El mapa se muestra y conserva su carga diferida; no aumenta los presupuestos de recursos.
- No se publican PII ni coordenadas exactas sensibles.
- Pasan las aduanas de CI antes de desplegar.

### Comandos de validación

Están en [CONTRIBUTING.md](../../CONTRIBUTING.md) y corren solos en cada push. Después de
pasarlas, desplegar con Docker y confirmar que los tres servicios estén saludables. No
desplegar datos demostrativos como si fueran información real.

## Corte heurístico de usabilidad

Puntuación actual: **9/10**. No quedan hallazgos automáticos de severidad 3 o 4. Axe pasa la
portada y los recorridos “Necesito ayuda”, “Quiero ayudar” y “Reportar”. El foco visible cubre
botones, enlaces, campos, selectores y controles desplegables. La brecha de severidad 2 es la
validación en navegador real de contraste, zoom al 200/400 %, lector de pantalla, LCP e INP.

## Regla de actualización

Después de cada bloque se actualizan este plan y la auditoría. Los bloqueos externos se mantienen
visibles y nunca se convierten en supuestos ni datos inventados.

## Por qué el mapa no se carga solo en el teléfono

Lighthouse móvil daba rendimiento 69 y un tiempo total de bloqueo de entre 5.868 y 8.102 ms
según la corrida. La causa era una sola: MapLibre consume cerca de siete segundos de CPU en
un teléfono de gama media y producía las cinco tareas largas de la carga. La página se veía
en 1,9 s, pero durante diez segundos los tres botones no respondían al toque.

Se intentó primero aplazarlo con `requestIdleCallback`. **No sirvió**: mover el gasto más
tarde no lo elimina, y la medición empeoró. Lo que funcionó fue no cargarlo: en pantallas de
hasta 900 px el mapa espera a que alguien lo pida con un botón que dice cuántos puntos hay.
En escritorio, donde el mapa es el centro de la página y sobra CPU, sigue cargando solo.

Resultado medido sobre producción, mediana de tres corridas:

| | Antes | Después |
|---|---:|---:|
| Rendimiento | 69 | 99 |
| Bloqueo total | 5.868–8.102 ms | 74 ms |
| Hasta poder interactuar | 10,2 s | 1,9 s |

Las tres corridas nuevas dieron 50, 74 y 94 ms. La dispersión enorme de antes la producían
las propias tareas largas de MapLibre, no la máquina de medición.

Antes de tocar esto, comprobar lo que no depende del ruido de Lighthouse: en un viewport de
teléfono no debe pedirse ningún recurso `maplibre` durante la carga, y sí debe pedirse al
tocar el botón.
