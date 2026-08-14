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
