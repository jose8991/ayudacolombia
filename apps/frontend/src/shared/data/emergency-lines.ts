export interface EmergencyLine {
  label: string;
  /** Número tal como se marca, sin espacios. */
  number: string;
  /** Texto visible; conserva los espacios para que se lea y se dicte fácil. */
  display: string;
  purpose: string;
  /** Territorio al que aplica; sin valor, aplica a todo el país. */
  territoryId?: string;
}

/**
 * Fuente y verificación en docs/03_REFERENCE/fuentes-oficiales.md.
 * Solo líneas de entidades públicas: aquí nunca se publican cuentas bancarias.
 */
export const EMERGENCY_LINES: readonly EmergencyLine[] = [
  {
    label: 'Emergencias',
    number: '123',
    display: '123',
    purpose: 'Peligro de vida, las 24 horas',
  },
  {
    label: 'Bomberos',
    number: '119',
    display: '119',
    purpose: 'Incendio, rescate o estructura en riesgo',
  },
  {
    label: 'Cruz Roja',
    number: '132',
    display: '132',
    purpose: 'Atención en salud y socorro',
  },
  {
    label: 'Personas desaparecidas',
    number: '3212139525',
    display: '321 213 9525',
    purpose: 'Cruz Roja Colombiana',
  },
  {
    label: 'Alcaldía de Pereira',
    number: '6063248000',
    display: '(606) 324 8000',
    purpose: 'Línea de atención a la ciudadanía',
    territoryId: 'co-ris-pereira',
  },
  {
    label: 'Desaparecidos en Pereira',
    number: '3164781821',
    display: '316 478 1821',
    purpose: 'Cruz Roja Pereira',
    territoryId: 'co-ris-pereira',
  },
  {
    label: 'Bomberos de Pereira',
    number: '6063290100',
    display: '(606) 329 0100',
    purpose: 'Estación central',
    territoryId: 'co-ris-pereira',
  },
  {
    label: 'DIGER Dosquebradas',
    number: '6063515333',
    display: '(606) 351 5333',
    purpose: 'Gestión del riesgo del municipio',
    territoryId: 'co-ris-dosquebradas',
  },
  {
    label: 'Bomberos de Dosquebradas',
    number: '6063402419',
    display: '(606) 340 2419',
    purpose: 'Estación de Dosquebradas',
    territoryId: 'co-ris-dosquebradas',
  },
];

export function linesForTerritory(territoryId: string): readonly EmergencyLine[] {
  return EMERGENCY_LINES.filter((line) => !line.territoryId || line.territoryId === territoryId);
}
