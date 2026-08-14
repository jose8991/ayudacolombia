// @ts-expect-error Las pruebas se ejecutan en Node; la app no necesita @types/node.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync('src/app/styles.css', 'utf8');

it('permite reflow por debajo de 320px sin imponer un ancho mínimo al documento', () => {
  expect(css).not.toMatch(/body\s*\{[^}]*min-width:\s*320px/);
  expect(css).toMatch(/html\s*\{[^}]*overflow-x:\s*clip/);
});

it('mantiene los recorridos móviles en una columna hasta 520px', () => {
  expect(css).toMatch(
    /@media \(max-width: 520px\)[\s\S]*?\.journey-options\s*\{\s*grid-template-columns:\s*1fr/,
  );
});

it('evita controles sticky que puedan ocultar el foco en móvil', () => {
  const mobileRules = css.slice(css.indexOf('@media (max-width: 700px)'));
  expect(mobileRules).toMatch(/\.app-header\s*\{\s*position:\s*static/);
  expect(mobileRules).toMatch(/\.primary-submit\s*\{[^}]*position:\s*static/);
});

it('respeta el tamaño mínimo de objetivo táctil de la WCAG 2.2', () => {
  // SC 2.5.8 (AA) exige 24x24 px CSS. La práctica recomendada de Apple y Android
  // es 44 y 48; aquí se acepta 24 solo para casillas dentro de una etiqueta grande.
  const declared = [...css.matchAll(/min-height:\s*(\d+)px/g)].map((match) => Number(match[1]));
  const interactive = declared.filter((value) => value < 100);
  expect(Math.min(...interactive)).toBeGreaterThanOrEqual(24);
});

it('mantiene los controles principales en 44px o más', () => {
  for (const rule of ['.emergency-call', '.nearby-action', '.confirmed-only', '.coordina-link']) {
    const block = css.slice(css.indexOf(rule + ' {'));
    const size = Number(/min-height:\s*(\d+)px/.exec(block)?.[1]);
    expect(size, rule).toBeGreaterThanOrEqual(44);
  }
});
