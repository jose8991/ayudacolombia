import { expect, it } from 'vitest';
import { boundingBox, isPointInArea, isPointInRing, type AreaGeometry } from '@timeliber/kit';

// Un cuadrado con un hueco en el centro, como una comuna con un parque excluido.
const conHueco: AreaGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
    [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ],
  ],
};

it('reconoce un punto dentro del contorno', () => {
  expect(isPointInArea([1, 1], conHueco)).toBe(true);
  expect(isPointInArea([9, 9], conHueco)).toBe(true);
});

it('deja fuera lo que cae en un hueco', () => {
  // Esto es lo que evita contar un punto dentro de una zona que en realidad lo excluye.
  expect(isPointInArea([5, 5], conHueco)).toBe(false);
});

it('deja fuera lo que está por fuera del contorno', () => {
  expect(isPointInArea([-1, 5], conHueco)).toBe(false);
  expect(isPointInArea([11, 5], conHueco)).toBe(false);
});

it('funciona con varios polígonos sueltos', () => {
  const dosIslas: AreaGeometry = {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
      [
        [
          [10, 10],
          [12, 10],
          [12, 12],
          [10, 12],
          [10, 10],
        ],
      ],
    ],
  };

  expect(isPointInArea([1, 1], dosIslas)).toBe(true);
  expect(isPointInArea([11, 11], dosIslas)).toBe(true);
  expect(isPointInArea([5, 5], dosIslas)).toBe(false);
});

it('calcula la caja que encierra la zona, para encuadrar el mapa', () => {
  expect(boundingBox(conHueco)).toEqual({ west: 0, south: 0, east: 10, north: 10 });
});

it('el anillo por separado también responde', () => {
  const cuadrado = [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
    [0, 0],
  ];

  expect(isPointInRing([2, 2], cuadrado)).toBe(true);
  expect(isPointInRing([5, 2], cuadrado)).toBe(false);
});
