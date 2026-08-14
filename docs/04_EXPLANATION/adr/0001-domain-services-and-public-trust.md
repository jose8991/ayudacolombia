# ADR 0001: servicios de dominio y confianza pública

- Estado: aceptado
- Fecha: 2026-08-13

## Contexto

La información humanitaria puede provocar desplazamientos y decisiones urgentes. El frontend no
debe decidir si un centro es confiable ni convertir silenciosamente un registro en verificado.
Además, las reglas de autorización no deben quedar mezcladas con FastAPI.

## Decisión

- El backend sigue el flujo `Router → Service → Repository`.
- El router compone dependencias y contratos HTTP.
- El servicio aplica autorización, visibilidad y reglas de confianza.
- El repositorio es la única capa que consulta o modifica PostgreSQL.
- Los centros `official` y `verified` son públicos por defecto.
- Los centros `reported` requieren una solicitud explícita del consumidor.
- Los contratos de entrada y salida son clases Pydantic separadas.
- Los errores de dominio se traducen globalmente al formato estándar de la API.
- El frontend administra datos remotos con TanStack Query.

## Consecuencias

La expansión a nuevos municipios reutiliza las mismas reglas. La información comunitaria conserva
su utilidad sin confundirse con datos confirmados. Cada nuevo dominio deberá tener pruebas del
servicio y pruebas de integración para sus rutas críticas.
