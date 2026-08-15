/**
 * Marcadores de mapa dibujados en el navegador, sin fuentes ni imágenes externas.
 *
 * Un marcador dice tres cosas a la vez y ninguna depende solo del color, que es lo que
 * lo hace legible para daltónicos y en impresión:
 *
 *  - la FORMA del glifo indica de qué se trata;
 *  - el BORDE indica cuánta confianza merece: grueso continuo, fino continuo, punteado;
 *  - un marcador apagado con punto ámbar avisa que el dato envejeció, y una franja
 *    cruzada que ese lugar ya no aplica.
 *
 * Se registran como imágenes en el mapa (`map.addImage`), así que funcionan sin red.
 */

/** Cuánta confianza merece el dato: alta, media o sin confirmar. */
export type TrustLevel = 'high' | 'medium' | 'low';

/** Siluetas incluidas. Distinguibles entre sí en blanco y negro. */
export type GlyphName = 'casa' | 'persona' | 'corazon' | 'alerta';

export interface CategoryStyle {
  color: string;
  glyph: GlyphName;
}

/** Una categoría por clave; el color solo refuerza lo que ya dice la forma. */
export type MarkerPalette = Record<string, CategoryStyle>;

export interface MarkerState {
  category: string;
  trust: TrustLevel;
  /** El dato lleva demasiado sin reconfirmarse. */
  aged?: boolean;
  /** Ese lugar ya no recibe a nadie: lleno, cerrado o suspendido. */
  blocked?: boolean;
}

const INK = '#17332a';
const AGED_DOT = '#e16e27';

/** Tamaño en píxeles de dispositivo; con pixelRatio 2 el marcador mide 48 px en pantalla. */
export const MARKER_SIZE = 96;
export const MARKER_PIXEL_RATIO = 2;

const TRUST_LEVELS: TrustLevel[] = ['high', 'medium', 'low'];

/**
 * Nombre estable de la imagen para un estado. Guárdalo como propiedad del punto y la
 * expresión del mapa se reduce a `['get', 'icon']`.
 */
export function markerIconName(state: MarkerState): string {
  const age = state.aged ? 'old' : 'new';
  const block = state.blocked ? 'blocked' : 'free';
  return `marker-${state.category}-${state.trust}-${age}-${block}`;
}

function fade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (0x8c - channel) * amount);
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`;
}

function drawGlyph(
  context: CanvasRenderingContext2D,
  glyph: GlyphName,
  center: number,
) {
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 6;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  const unit = MARKER_SIZE / 96;
  const scale = (value: number) => value * unit;

  if (glyph === 'casa') {
    // Casa: techo y cuerpo.
    context.beginPath();
    context.moveTo(center, center - scale(20));
    context.lineTo(center + scale(20), center - scale(2));
    context.lineTo(center - scale(20), center - scale(2));
    context.closePath();
    context.fill();
    context.fillRect(center - scale(13), center - scale(2), scale(26), scale(20));
    return;
  }
  if (glyph === 'persona') {
    // Persona: aquí hay gente que necesita ayuda.
    context.beginPath();
    context.arc(center, center - scale(13), scale(8), 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(center - scale(17), center + scale(20));
    context.quadraticCurveTo(center - scale(17), center - scale(1), center, center - scale(1));
    context.quadraticCurveTo(
      center + scale(17),
      center - scale(1),
      center + scale(17),
      center + scale(20),
    );
    context.closePath();
    context.fill();
    return;
  }
  if (glyph === 'corazon') {
    // Corazón: ayuda ofrecida.
    context.beginPath();
    context.moveTo(center, center + scale(19));
    context.bezierCurveTo(
      center - scale(26),
      center + scale(1),
      center - scale(15),
      center - scale(22),
      center,
      center - scale(8),
    );
    context.bezierCurveTo(
      center + scale(15),
      center - scale(22),
      center + scale(26),
      center + scale(1),
      center,
      center + scale(19),
    );
    context.fill();
    return;
  }
  // Daño: triángulo de advertencia.
  context.beginPath();
  context.moveTo(center, center - scale(21));
  context.lineTo(center + scale(21), center + scale(17));
  context.lineTo(center - scale(21), center + scale(17));
  context.closePath();
  context.fill();
  context.strokeStyle = INK;
  context.lineWidth = scale(5);
  context.beginPath();
  context.moveTo(center, center - scale(7));
  context.lineTo(center, center + scale(5));
  context.stroke();
  context.beginPath();
  context.arc(center, center + scale(12), scale(2.6), 0, Math.PI * 2);
  context.fillStyle = INK;
  context.fill();
}

function drawMarker(
  color: string,
  glyph: GlyphName,
  trust: TrustLevel,
  aged: boolean,
  blocked: boolean,
): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = MARKER_SIZE;
  canvas.height = MARKER_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const center = MARKER_SIZE / 2;
  const unit = MARKER_SIZE / 96;

  // Halo blanco: separa el marcador del mapa de fondo en cualquier ciudad.
  context.beginPath();
  context.arc(center, center, 44 * unit, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.95)';
  context.fill();

  context.beginPath();
  context.arc(center, center, 36 * unit, 0, Math.PI * 2);
  context.fillStyle = aged ? fade(color, 0.55) : color;
  context.fill();

  context.strokeStyle = INK;
  context.setLineDash(trust === 'low' ? [7 * unit, 6 * unit] : []);
  context.lineWidth = (trust === 'high' ? 8 : 5) * unit;
  context.beginPath();
  context.arc(center, center, 36 * unit, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  drawGlyph(context, glyph, center);

  if (blocked) {
    // Franja cruzada: este lugar ya no recibe gente.
    context.strokeStyle = '#ffffff';
    context.lineWidth = 13 * unit;
    context.beginPath();
    context.moveTo(center - 30 * unit, center + 30 * unit);
    context.lineTo(center + 30 * unit, center - 30 * unit);
    context.stroke();
    context.strokeStyle = INK;
    context.lineWidth = 7 * unit;
    context.stroke();
  }

  if (aged) {
    context.beginPath();
    context.arc(center + 27 * unit, center - 27 * unit, 11 * unit, 0, Math.PI * 2);
    context.fillStyle = AGED_DOT;
    context.fill();
    context.lineWidth = 4 * unit;
    context.strokeStyle = '#ffffff';
    context.stroke();
  }

  return context.getImageData(0, 0, MARKER_SIZE, MARKER_SIZE);
}

export interface MarkerImage {
  name: string;
  data: ImageData;
}

/**
 * Genera todas las combinaciones de una paleta: categorías x 3 confianzas x envejecido x
 * bloqueado. Son imágenes pequeñas y se crean una sola vez, al iniciar el mapa.
 */
export function buildMarkerImages(palette: MarkerPalette): MarkerImage[] {
  const images: MarkerImage[] = [];
  for (const [category, style] of Object.entries(palette)) {
    for (const trust of TRUST_LEVELS) {
      for (const aged of [false, true]) {
        for (const blocked of [false, true]) {
          const data = drawMarker(style.color, style.glyph, trust, aged, blocked);
          if (!data) continue;
          images.push({
            name: markerIconName({ category, trust, aged, blocked }),
            data,
          });
        }
      }
    }
  }
  return images;
}
