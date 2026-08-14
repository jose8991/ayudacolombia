import { expect, it } from 'vitest';
import type { HumanitarianMapPoint } from '../src/entities/incident';
import { matchesQuery } from '../src/features/map-filter/search';

// Un albergue real de Pereira, tal como lo devuelve la API hoy.
const albergue: HumanitarianMapPoint = {
  id: 'center-1',
  regionId: 'co-ris-pereira',
  category: 'aid-center',
  title: 'Albergue Parque Olaya Herrera',
  neighborhood: 'Albergue Parque Olaya Herrera',
  description: 'Abierto para recibir ayudas.',
  address: 'Parque Olaya Herrera, Centro, Pereira',
  schedule: 'Confirma por teléfono antes de ir.',
  acceptedItems: ['Alojamiento temporal'],
  severity: 'low',
  verificationStatus: 'official',
  observedAt: '2026-08-14T09:00:00-05:00',
  coordinates: [-75.696283, 4.809428],
};

const acopio: HumanitarianMapPoint = {
  ...albergue,
  id: 'center-2',
  title: 'Punto de acopio y caracterización CAM',
  neighborhood: 'Punto de acopio y caracterización CAM',
  address: 'Calle 36 con Avenida Simón Bolívar, Dosquebradas',
  acceptedItems: ['Alimentos no perecederos', 'Agua', 'Cobijas'],
};

it('encuentra un albergue aunque su ficha nunca diga la palabra buscada', () => {
  // El dato vive en accepted_items, que antes no se miraba: el atajo daba cero resultados.
  expect(matchesQuery(albergue, 'dormir')).toBe(true);
  expect(matchesQuery(acopio, 'comida')).toBe(true);
});

it('no devuelve lo que no corresponde al tema', () => {
  expect(matchesQuery(albergue, 'salud')).toBe(false);
  expect(matchesQuery(acopio, 'salud')).toBe(false);
});

it('un acopio con cobijas también sirve para dormir', () => {
  expect(matchesQuery(acopio, 'dormir')).toBe(true);
});

it('sigue funcionando cuando alguien escribe su propia búsqueda', () => {
  expect(matchesQuery(albergue, 'olaya')).toBe(true);
  expect(matchesQuery(albergue, 'dosquebradas')).toBe(false);
});

it('no se rompe con un punto sin dirección, horario ni artículos', () => {
  const minimo: HumanitarianMapPoint = {
    ...albergue,
    address: undefined,
    schedule: undefined,
    acceptedItems: undefined,
    coordinates: null,
  };

  expect(matchesQuery(minimo, 'dormir')).toBe(true);
  expect(matchesQuery(minimo, 'salud')).toBe(false);
});
