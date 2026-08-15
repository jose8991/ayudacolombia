import { RELIEF_ITEMS } from '../../shared/data/relief-items';
import type { ReportKind } from './report-kind';

const OFFER_KINDS = [
  'Transporte',
  'Comida',
  'Agua',
  'Alojamiento',
  'Tiempo y manos',
  'Otra cosa',
] as const;

const PUBLIC_INTRO =
  'Se publica de una vez, marcado como "Sin confirmar". No escribas datos de personas.';

export interface KindConfig {
  eyebrow: string;
  title: string;
  intro: string;
  /** Solo los tipos que se eligen en el menú de reportes pueden volver a él. */
  canChangeKind: boolean;
  /** Botones en vez de escribir un título: quita la hoja en blanco. */
  chips?: { legend: string; prefix: string; options: readonly string[] };
  /** Cuando el título sí se escribe, por no existir un vocabulario cerrado. */
  freeTitle?: { label: string; placeholder: string };
  neighborhoodRequired: boolean;
  description: { label: string; placeholder: string; required: boolean };
  phone: 'required' | 'optional' | 'none';
  phoneHint: string;
  /** "¿Para cuándo?"; una oferta o un lugar no tienen urgencia propia. */
  askUrgency: boolean;
  consent: string;
}

/**
 * Cada tipo de publicación cambia una decena de detalles: el título, qué se pide, qué es
 * obligatorio y qué se promete sobre los datos. Tenerlos en una tabla, y no en ternarios
 * anidados dentro del formulario, permite leer un tipo completo de un vistazo y añadir
 * uno nuevo sin tocar la interfaz.
 */
export const KIND_CONFIG: Record<ReportKind, KindConfig> = {
  need: {
    eyebrow: 'Solicitud privada',
    title: 'Dinos 3 cosas',
    intro: 'Tu teléfono y tu ubicación exacta no aparecerán en el mapa.',
    canChangeKind: false,
    neighborhoodRequired: true,
    description: {
      label: '¿Qué está pasando?',
      placeholder: 'Ej. somos 4 y no tenemos agua',
      required: false,
    },
    phone: 'required',
    phoneHint: 'Para poder llamarte. No aparece en el mapa.',
    askUrgency: true,
    consent: 'Acepto que TIMELIBER S.A.S. use estos datos solo para ayudarme.',
  },
  'community-need': {
    eyebrow: 'Aquí necesitan ayuda',
    title: 'Cuéntanos qué hace falta',
    intro: PUBLIC_INTRO,
    canChangeKind: true,
    chips: { legend: '¿Qué hace falta?', prefix: 'Necesitan ', options: RELIEF_ITEMS },
    neighborhoodRequired: true,
    description: {
      label: '¿Qué está pasando?',
      placeholder: 'Ej. son 20 familias sin agua desde ayer',
      required: true,
    },
    phone: 'optional',
    phoneHint: 'Opcional. Para confirmar el aviso. No aparece en el mapa.',
    askUrgency: true,
    consent: 'Acepto que TIMELIBER S.A.S. use estos datos solo para coordinar esta ayuda.',
  },
  offer: {
    eyebrow: 'Ofrezco ayuda',
    title: 'Publica lo que puedes dar',
    intro: PUBLIC_INTRO,
    canChangeKind: false,
    chips: { legend: '¿Qué puedes dar?', prefix: 'Ofrezco ', options: OFFER_KINDS },
    neighborhoodRequired: false,
    description: {
      label: '¿Cuánto y hasta cuándo?',
      placeholder: 'Ej. 20 mercados, hoy hasta las 6 p. m.',
      required: true,
    },
    phone: 'required',
    phoneHint: 'Para que te puedan llamar. No aparece en el mapa.',
    askUrgency: false,
    consent: 'Acepto que TIMELIBER S.A.S. use estos datos solo para coordinar esta ayuda.',
  },
  place: {
    eyebrow: 'Informar un lugar',
    title: 'Informa el lugar',
    intro: PUBLIC_INTRO,
    canChangeKind: true,
    freeTitle: { label: 'Nombre del lugar', placeholder: 'Ej. Albergue La Esperanza' },
    neighborhoodRequired: false,
    description: {
      label: '¿Qué recibe o entrega este lugar?',
      placeholder: 'Ej. recibe agua y cobijas, 8 a. m. a 5 p. m.',
      required: true,
    },
    phone: 'none',
    phoneHint: '',
    askUrgency: false,
    consent: 'Acepto que TIMELIBER S.A.S. use estos datos solo para coordinar esta ayuda.',
  },
  damage: {
    eyebrow: 'Reportar una situación',
    title: 'Cuéntanos qué pasó',
    intro: PUBLIC_INTRO,
    canChangeKind: true,
    freeTitle: { label: 'Resumen', placeholder: 'Ej. Vía bloqueada cerca del parque' },
    neighborhoodRequired: false,
    description: {
      label: '¿Qué pasó y cuándo lo viste?',
      placeholder: 'Ej. derrumbe cerró la vía esta mañana',
      required: true,
    },
    phone: 'none',
    phoneHint: '',
    askUrgency: true,
    consent: 'Acepto que TIMELIBER S.A.S. use estos datos solo para coordinar esta ayuda.',
  },
};
