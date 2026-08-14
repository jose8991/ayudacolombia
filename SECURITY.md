# Seguridad

## Reportar una vulnerabilidad

Escribe a **timeliber@proton.me** con el asunto `SEGURIDAD`. Responderemos lo antes
posible. No abras un issue público: esta plataforma maneja datos de personas en
emergencia y una falla divulgada antes de tiempo puede exponerlas.

Incluye, si puedes, qué encontraste, cómo reproducirlo y qué impacto crees que tiene.
Agradecemos el reporte responsable y no emprenderemos acciones contra quien investigue
de buena fe y sin degradar el servicio ni acceder a datos de terceros.

## Qué protege esta plataforma

- **Teléfonos y medios de contacto**: se guardan cifrados en reposo y nunca aparecen en
  la proyección pública. Solo los ve un perfil con `REPORT_READ_SENSITIVE` en su
  territorio.
- **Ubicaciones**: las coordenadas públicas se redondean; la ubicación exacta de una
  solicitud privada no se publica.
- **Separación estructural**: los modelos públicos son distintos de los internos, así que
  un descuido no puede filtrar un campo sensible.
- **Autorización por territorio**: verificar o moderar está limitado al territorio
  asignado, incluso para perfiles con permiso.

## Fuera de alcance

- Los secretos de producción viven en `.env.prod`, fuera del control de versiones.
- Esta plataforma **no publica cuentas bancarias** de ninguna clase. Si ves una,
  es falsa y queremos saberlo.

## Dependencias

Las versiones están fijadas en `uv.lock` y `package-lock.json`. Si detectas una
dependencia vulnerable, repórtala por el mismo canal.
