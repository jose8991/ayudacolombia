# Cómo contribuir

Gracias por querer ayudar. Esta plataforma se usa durante emergencias reales, así que
las reglas de abajo no son burocracia: son lo que evita que alguien se desplace a un
lugar equivocado.

## Reglas que no se negocian

1. **Ningún dato se inventa.** Si no tienes la fuente, no entra. Cada punto publicado
   lleva de dónde salió y cuándo se verificó.
2. **Ninguna coordenada se adivina.** Se geocodifica y se comprueba dentro del polígono
   del municipio antes de publicar. Si no pasa esa prueba, no se publica.
3. **`official` solo si lo publicó la entidad** en su propio canal. Si la fuente es
   prensa que la cita, el nivel es `verified`.
4. **Nunca se publican datos personales** ni ubicaciones exactas de personas
   vulnerables. Los contactos van cifrados y solo los ve coordinación.
5. **Nada caduca "nunca".** Toda información cambiante lleva fecha y vence.
6. **No se publican cuentas bancarias** de ninguna clase.

## Levantar el proyecto

```bash
docker compose -f docker-compose.local.yml up --build
```

La aplicación queda en `http://localhost:3000` y la API en `http://localhost:8000/docs`.

## Antes de abrir un cambio

```bash
# Frontend
npm run format:check --workspace=@sos/frontend
npm run lint --workspace=@sos/frontend
npm run typecheck --workspace=@sos/frontend
npm test --workspace=@sos/frontend
npm run build --workspace=@sos/frontend

# Backend
cd apps/backend
uv run ruff check .
uv run mypy --strict app
uv run pytest -q
```

Todo tiene que pasar. El build falla a propósito si el JavaScript inicial supera 100 KB
comprimido: en zona de desastre la gente entra con red mala y batería baja.

Si cambias el contrato de la API, regenera `docs/03_REFERENCE/openapi.json`:

```bash
cd apps/backend && uv run python ../../scripts/generate_openapi.py
```

## Qué esperamos del código

- **Backend**: dominios verticales con `Router → Service → Repository`. Los routers no
  llevan reglas de negocio; solo los repositorios usan SQLAlchemy.
- **Frontend**: los datos del servidor se administran con TanStack Query; el estado local
  queda para la interacción.
- **Accesibilidad**: objetivos táctiles de 24 px como mínimo (WCAG 2.2 SC 2.5.8) y 44 px
  en los controles principales. Nada puede depender solo del color.
- **Textos**: frases cortas, sin jerga. Quien lee está asustado y con poca batería.

## Qué esperamos de las pruebas

Una prueba debe describir un comportamiento que le importe a una persona, no la forma
interna del código. Si arreglas un fallo, deja una prueba que lo habría atrapado.

## Dudas

Abre un issue. Para vulnerabilidades, no: mira [SECURITY.md](SECURITY.md).
