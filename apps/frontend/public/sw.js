/*
 * Trabajador de servicio de Ayuda Colombia.
 *
 * En zona de desastre lo normal es abrir la aplicación sin señal. El objetivo es que
 * consultar siempre funcione: la pantalla carga, y se ve la última información conocida
 * con su fecha, que la interfaz ya presenta como "actualizado hace X" y advierte cuando
 * está envejecida.
 *
 * Enviar nunca se sirve desde la caché: las solicitudes de ayuda y los reportes viajan
 * por la cola cifrada que ya existe en la aplicación, no por aquí.
 */

const VERSION = 'v1';
const SHELL_CACHE = `sos-shell-${VERSION}`;
const DATA_CACHE = `sos-data-${VERSION}`;

// Rutas públicas de solo lectura. No se guarda nada de /coordina ni con sesión.
const CACHEABLE_API = ['/api/v1/territories', '/api/v1/centers', '/api/v1/reports/public'];

const isStaticAsset = (pathname) =>
  pathname.startsWith('/assets/') || pathname.startsWith('/fonts/') || pathname.startsWith('/icons/');

const isCacheableData = (pathname) =>
  pathname.startsWith('/data/') || CACHEABLE_API.some((prefix) => pathname.startsWith(prefix));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/', '/manifest.webmanifest']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== SHELL_CACHE && name !== DATA_CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackPath) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackPath) {
      const shell = await caches.open(SHELL_CACHE);
      const page = await shell.match(fallbackPath);
      if (page) return page;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/'));
    return;
  }
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (isCacheableData(url.pathname)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
  }
});
