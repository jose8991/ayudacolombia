/**
 * Vocabulario común de artículos, para que un centro toque en vez de escribir y para que
 * lo que publica se pueda comparar entre centros. La lista sale de lo que las entidades
 * están recogiendo tras el terremoto; ver docs/03_REFERENCE/fuentes-oficiales.md.
 */
export const RELIEF_ITEMS = [
  'Agua',
  'Alimentos',
  'Colchonetas',
  'Cobijas',
  'Aseo personal',
  'Pañales',
  'Ropa',
  'Medicamentos',
] as const;

export type ReliefItem = (typeof RELIEF_ITEMS)[number];
