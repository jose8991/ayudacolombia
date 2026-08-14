# AGENTS.md — SOS Pereira Frontend

## Stack

React 19, Vite, TypeScript estricto, MapLibre y TanStack Query.

## Reglas

- Flujo de dependencias: `shared → design-system → entities → features → widgets → pages → app`.
- Datos del servidor solo mediante TanStack Query.
- Reportes críticos deben funcionar con conectividad degradada.
- WCAG 2.2 AA; controles del mapa requieren alternativa textual.
- Nunca mostrar PII ni coordenadas sensibles en la capa pública.

## Docker

`docker compose up --build` desde esta carpeta expone la UI en el puerto 3000.

