# Fuentes oficiales y líneas de emergencia

Última revisión: 2026-08-14.

Este documento reúne los canales desde donde se alimenta la información publicada en Ayuda
Colombia y las líneas de atención que la plataforma muestra a la ciudadanía. Cada punto que se
publique debe poder rastrearse hasta una de estas fuentes.

## Por qué la carga no puede automatizarse

Se intentó leer los canales oficiales por programa. El resultado:

| Canal | Resultado | Consecuencia |
| --- | --- | --- |
| Instagram de las entidades | Exige inicio de sesión; devuelve la pantalla de acceso | No se puede leer por programa |
| `pereira.gov.co` → Comunicados Oficiales | Los comunicados se publican **como imágenes** | El texto no es legible por máquina |
| `diger.dosquebradas.gov.co` | Responde 403 a clientes automatizados | No se puede consultar por programa |
| `pereira.gov.co` → Puntos Albergue | Legible: nombra los albergues, sin direcciones | Sirve como fuente, requiere geocodificar |

La conclusión es la que define el producto: **la información oficial existe, pero está encerrada
en imágenes y en redes sociales que caducan.** Nadie puede construir un mapa a partir de ellas de
forma automática, y las historias desaparecen en 24 horas. Convertir esas publicaciones en datos
con nivel de verificación y fecha de caducidad es exactamente el trabajo de esta plataforma, y
por eso el canal de entrada es humano: alguien mira, y registra.

## Cómo se registra un punto

1. Carga inicial o masiva: `apps/backend/data/official-centers-<fecha>.json` y luego
   `python -m app.cli.load_official_centers data/official-centers-<fecha>.json`. Es idempotente
   por territorio y nombre.
2. Día a día: desde `/coordina`, con un perfil que tenga `REPORT_VERIFY` en ese territorio.

Reglas que no se negocian:

- `official` solo si la entidad lo publicó en su propio canal. Si la fuente es prensa que la
  cita, el nivel es `verified`.
- `last_verified_at` guarda la fecha de la fuente, no la de la carga. La caducidad de 24 horas
  hace el resto.
- Ninguna coordenada se inventa: se geocodifica y se comprueba dentro del polígono del municipio
  (`apps/frontend/public/data/municipios-risaralda-quindio-mgn2025.geojson`, DANE MGN 2025).
  Si no pasa esa prueba, no se publica.

## Canales por entidad

| Entidad | Canal | Dirección |
| --- | --- | --- |
| Alcaldía de Pereira | Sitio | `pereira.gov.co` |
| Alcaldía de Pereira | Instagram | `@alcaldiadepereira` |
| Alcaldía de Pereira | X | `@Alcaldiapereira` |
| Alcaldía de Pereira | Facebook | `AlcaldiaDePereira` |
| Alcaldía de Dosquebradas | Sitio | `dosquebradas.gov.co` |
| DIGER Dosquebradas | Sitio | `diger.dosquebradas.gov.co` |
| Bomberos Dosquebradas | Sitio | `bomberosdosquebradas.gov.co` |
| Bomberos Pereira | Instagram | `@bomberosoficialespereira` |
| Gobernación de Risaralda | Sitio | `risaralda.gov.co` |
| UNGRD | Sitio | `portal.gestiondelriesgo.gov.co` |
| Cruz Roja Colombiana | Sitio | `cruzrojacolombiana.org` |

## Líneas de atención

Nacionales, 24 horas:

| Línea | Para qué |
| --- | --- |
| 123 | Emergencias |
| 119 | Bomberos |
| 132 | Cruz Roja Colombiana |
| 321 213 9525 | Reportar personas desaparecidas (Cruz Roja Colombiana) |

Pereira:

| Contacto | Dato |
| --- | --- |
| Línea de atención de la Alcaldía | (+57) 6 3248000 · 6 3248179 |
| Estación Central de Bomberos | (+57) 606 3290100 |
| Cruz Roja Pereira, personas desaparecidas | 316 478 1821 |
| Sede de la Alcaldía | Carrera 7 n.º 18-55 |

Dosquebradas:

| Contacto | Dato |
| --- | --- |
| DIGER | (+57) 606 3515333 ext. 108 · Av. Simón Bolívar n.º 38-130 |
| Bomberos | (+57) 606 3402419 ext. 1001-1002 |
| Bomberos, móviles | 300 330 1194 · 320 578 9808 |

## Advertencia sobre donaciones

La UNGRD **no publica ninguna cuenta bancaria** para donaciones. Cualquier número de cuenta que
circule presentado como «la cuenta de la UNGRD para el terremoto» es falso. La plataforma no
publica cuentas bancarias de ninguna clase.
