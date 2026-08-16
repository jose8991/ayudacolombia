export interface OtherPlatform {
  name: string;
  url: string;
  /** Para qué sirve *esa*, no por qué existe la nuestra. */
  purpose: string;
}

/**
 * Otras plataformas de la emergencia.
 *
 * Están aquí porque quien busca ayuda merece encontrarla, no quedarse en el sitio que
 * abrió primero. Varias tienen mucha más información que nosotros —cientos de centros de
 * acopio, miles de puntos en todo el país— y ocultarlas para retener a alguien sería
 * exactamente lo contrario del objetivo.
 *
 * Todos los enlaces se comprobaron el 15 de agosto de 2026. Si alguno deja de responder,
 * quitarlo: un enlace roto en una emergencia gasta el tiempo de quien menos lo tiene.
 */
export const OTHER_PLATFORMS: readonly OtherPlatform[] = [
  {
    name: 'Ayudas Pereira',
    url: 'https://alluda.online/',
    purpose: 'Centros de acopio de Pereira y otras ciudades, con qué le falta a cada uno.',
  },
  {
    name: 'Mapa del terremoto',
    url: 'https://www.mapadelterremoto.com/',
    purpose: 'Mapa nacional con puntos afectados de todos los departamentos.',
  },
  {
    name: 'Cuidar Colombia',
    url: 'https://cuidarcolombia.vercel.app/',
    purpose: 'Información verificada, canales de donación y búsqueda de personas.',
  },
  {
    name: 'UNGRD',
    url: 'https://portal.gestiondelriesgo.gov.co/',
    purpose: 'Cifras y comunicados oficiales del Gobierno Nacional.',
  },
];
