# @timeliber/kit

Piezas que salieron de construir [Ayuda Colombia](../../README.md) y que no saben nada de
emergencias. Están aquí para copiarse o importarse en otros productos sin arrastrar el
dominio humanitario.

Todo funciona en el navegador, sin red y sin dependencias externas.

## Marcadores de mapa

Marcadores dibujados en canvas y registrados como imágenes en MapLibre. Un marcador dice
tres cosas a la vez y **ninguna depende solo del color**, así que se leen con daltonismo y
en impresión:

- la **forma** del glifo indica de qué se trata;
- el **borde** indica cuánta confianza merece: grueso continuo, fino continuo, punteado;
- **apagado con punto ámbar** avisa que el dato envejeció, y una **franja cruzada** que
  ese lugar ya no aplica.

```ts
import { buildMarkerImages, markerIconName, MARKER_PIXEL_RATIO } from '@timeliber/kit';

const palette = {
  sede: { color: '#168267', glyph: 'casa' },
  pedido: { color: '#c4392d', glyph: 'persona' },
};

for (const image of buildMarkerImages(palette)) {
  map.addImage(image.name, image.data, { pixelRatio: MARKER_PIXEL_RATIO });
}

// Guarda el nombre como propiedad del punto y la capa se reduce a ['get', 'icon'].
const icon = markerIconName({ category: 'sede', trust: 'high', aged: false });
```

Glifos incluidos: `casa`, `persona`, `corazon`, `alerta`.

## Cola cifrada

Guarda un envío pendiente cifrado con AES-GCM cuando la red falla, y lo devuelve cuando
vuelve. La clave se genera por sesión y vive en `sessionStorage`; el dato cifrado, en
`localStorage`. Al cerrar el navegador la clave desaparece y lo pendiente deja de ser
legible: **se descarta solo**, que es lo que se quiere de un dato sensible que ya nadie va
a enviar.

```ts
const outbox = createSecureOutbox<MiEnvio>('mi-app:outbox');

try {
  await enviar(datos);
  outbox.clear();
} catch {
  await outbox.save(datos); // se reintenta al volver la conexión
}
```

## Tiempo y distancia en lenguaje corriente

```ts
formatFreshness('2026-08-14T09:00:00-05:00'); // "hace 5 horas"
formatDistance(1240); // "a 1,2 km"
expiresAt('72'); // fecha ISO dentro de tres días
```

`formatFreshness` existe porque mostrar solo la hora ("actualizado 5:40") hace que un dato
de hace tres días parezca reciente. El tiempo transcurrido es la información.

`expiresAt` cae a un día ante un valor vacío o absurdo: ante la duda, que caduque antes y
nunca "nunca".

## Bloqueo de desplazamiento

```ts
useBodyScrollLock(hayPanelAbierto);
```

Sin esto, cerrar un panel en móvil devuelve a la persona a un punto distinto del que dejó.

## Iconos de PWA

Genera los PNG de instalación sin librerías de imagen, solo con `zlib`. Fondo a sangre y
cruz blanca centrada, que sobrevive al recorte circular de Android.

```js
import { generateIcons } from '@timeliber/kit/pwa/generate-icons.mjs';

generateIcons({ outDir: 'public/icons', color: [0x16, 0x79, 0x5d] });
```

## Lo que no está aquí, a propósito

El trabajador de servicio vive en cada aplicación, porque la lista de rutas que vale la
pena guardar depende del producto. El de Ayuda Colombia está en
`apps/frontend/public/sw.js` y sirve de ejemplo: solo cachea `GET`, nunca envíos, y su
lista de rutas es explícita.
