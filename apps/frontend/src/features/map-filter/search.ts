import type { HumanitarianMapPoint } from '../../entities/incident';

/**
 * Un albergue no dice "alojamiento" en su nombre y un acopio no dice "alimentos". Buscar
 * por una sola palabra dejaba los atajos de "Necesito ayuda" en cero resultados aunque
 * hubiera centros publicados. Cada tema agrupa las palabras con las que sí aparecen.
 */
export const TOPIC_WORDS: Record<string, readonly string[]> = {
  comida: ['alimento', 'comida', 'mercado', 'agua', 'acopio'],
  salud: ['salud', 'medicamento', 'médic', 'enfermer', 'botiquín', 'hospital'],
  dormir: ['alojamiento', 'albergue', 'dormir', 'colchoneta', 'cobija', 'refugio'],
};

const searchableText = (point: HumanitarianMapPoint) =>
  [
    point.title,
    point.neighborhood,
    point.description,
    point.address ?? '',
    point.schedule ?? '',
    ...(point.acceptedItems ?? []),
  ]
    .join(' ')
    .toLocaleLowerCase('es');

export function matchesQuery(point: HumanitarianMapPoint, query: string): boolean {
  const haystack = searchableText(point);
  const words = TOPIC_WORDS[query];
  if (words) return words.some((word) => haystack.includes(word));
  return haystack.includes(query);
}
