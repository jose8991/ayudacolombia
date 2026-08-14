// @ts-expect-error Las pruebas se ejecutan en Node; la app no necesita @types/node.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
const serviceWorker = readFileSync('public/sw.js', 'utf8');
const html = readFileSync('index.html', 'utf8');

it('declara un manifiesto instalable en español', () => {
  expect(manifest.name).toBe('Ayuda Colombia');
  expect(manifest.start_url).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.lang).toBe('es-CO');
});

it('incluye los iconos que Android exige para instalar', () => {
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
  const purposes = manifest.icons.map((icon: { purpose: string }) => icon.purpose);
  expect(purposes).toContain('maskable');
});

it('enlaza el manifiesto desde la portada', () => {
  expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/);
  expect(html).toMatch(/apple-touch-icon/);
});

it('nunca sirve envíos desde la caché', () => {
  expect(serviceWorker).toMatch(/request\.method !== 'GET'/);
});

it('no guarda respuestas con sesión ni de otros dominios', () => {
  const allowlist = serviceWorker.match(/const CACHEABLE_API = \[([^\]]*)\]/)?.[1] ?? '';
  expect(allowlist).not.toMatch(/coordina|auth|moderation|mine/);
  expect(serviceWorker).toMatch(/url\.origin !== self\.location\.origin/);
});

it('solo cachea las rutas públicas de consulta', () => {
  expect(serviceWorker).toMatch(/'\/api\/v1\/territories'/);
  expect(serviceWorker).toMatch(/'\/api\/v1\/centers'/);
  expect(serviceWorker).toMatch(/'\/api\/v1\/reports\/public'/);
});

it('devuelve la portada guardada cuando la navegación falla', () => {
  expect(serviceWorker).toMatch(/request\.mode === 'navigate'/);
  expect(serviceWorker).toMatch(/networkFirst\(request, SHELL_CACHE, '\/'\)/);
});
