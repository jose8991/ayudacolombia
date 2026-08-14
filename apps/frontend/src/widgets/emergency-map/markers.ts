import type { HumanitarianMapPoint, MapCategory } from '../../entities/incident';

/**
 * Marcadores dibujados en el navegador, sin fuentes ni imágenes externas: funcionan sin red.
 *
 * Cada marcador dice tres cosas a la vez, y ninguna depende solo del color:
 *  - la FORMA del símbolo indica de qué se trata (albergue, necesidad, oferta, daño);
 *  - el BORDE indica cuánto se puede confiar: grueso continuo confirmado, fino continuo
 *    revisado, punteado sin confirmar;
 *  - un marcador apagado con punto ámbar indica que la información está envejecida, y una
 *    franja cruzada indica que el lugar ya no recibe gente.
 */

export type TrustLevel = 'official' | 'verified' | 'reported';

const CATEGORY_COLORS: Record<MapCategory, string> = {
  need: '#d8483e',
  offer: '#2767b2',
  'aid-center': '#168267',
  damage: '#e47b28',
};

const CATEGORIES = Object.keys(CATEGORY_COLORS) as MapCategory[];
const LEVELS: TrustLevel[] = ['official', 'verified', 'reported'];

const INK = '#17332a';
const AGED_DOT = '#e16e27';

/** Tamaño en píxeles de dispositivo; con pixelRatio 2 el marcador mide 48 px en pantalla. */
export const MARKER_SIZE = 96;
export const MARKER_PIXEL_RATIO = 2;

export function trustLevelOf(point: HumanitarianMapPoint): TrustLevel {
  if (point.verificationStatus === 'official') return 'official';
  if (point.verificationStatus === 'verified') return 'verified';
  return 'reported';
}

export function isAged(point: HumanitarianMapPoint): boolean {
  return point.isStale === true || point.verificationStatus === 'stale';
}

/** Un lugar que ya no recibe gente: lleno, cerrado o pidiendo que no envíen más. */
export function isBlocked(point: HumanitarianMapPoint): boolean {
  return (
    point.status === 'almost_full' || point.status === 'do_not_send' || point.status === 'closed'
  );
}

export function markerIconName(point: HumanitarianMapPoint): string {
  const age = isAged(point) ? 'old' : 'new';
  const block = isBlocked(point) ? 'blocked' : 'free';
  return `sos-${point.category}-${trustLevelOf(point)}-${age}-${block}`;
}

function fade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (0x8c - channel) * amount);
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`;
}

function drawGlyph(context: CanvasRenderingContext2D, category: MapCategory, center: number) {
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 6;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  const unit = MARKER_SIZE / 96;
  const scale = (value: number) => value * unit;

  if (category === 'aid-center') {
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
  if (category === 'need') {
    // Gota: necesidad básica.
    context.beginPath();
    context.moveTo(center, center - scale(22));
    context.bezierCurveTo(
      center + scale(20),
      center - scale(2),
      center + scale(14),
      center + scale(20),
      center,
      center + scale(20),
    );
    context.bezierCurveTo(
      center - scale(14),
      center + scale(20),
      center - scale(20),
      center - scale(2),
      center,
      center - scale(22),
    );
    context.fill();
    return;
  }
  if (category === 'offer') {
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
  category: MapCategory,
  level: TrustLevel,
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
  context.fillStyle = aged ? fade(CATEGORY_COLORS[category], 0.55) : CATEGORY_COLORS[category];
  context.fill();

  context.strokeStyle = INK;
  context.setLineDash(level === 'reported' ? [7 * unit, 6 * unit] : []);
  context.lineWidth = (level === 'official' ? 8 : 5) * unit;
  context.beginPath();
  context.arc(center, center, 36 * unit, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  drawGlyph(context, category, center);

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

/** Todas las combinaciones posibles; son 48 imágenes pequeñas y se generan una sola vez. */
export function buildMarkerImages(): MarkerImage[] {
  const images: MarkerImage[] = [];
  for (const category of CATEGORIES) {
    for (const level of LEVELS) {
      for (const aged of [false, true]) {
        for (const blocked of [false, true]) {
          const data = drawMarker(category, level, aged, blocked);
          if (!data) continue;
          images.push({
            name: `sos-${category}-${level}-${aged ? 'old' : 'new'}-${blocked ? 'blocked' : 'free'}`,
            data,
          });
        }
      }
    }
  }
  return images;
}
