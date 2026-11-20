// Service worker de reemplazo ("kill switch").
//
// La versión anterior de la app (Vite + PWA) registraba un service worker en /sw.js que
// guardaba la app vieja en caché y la seguía mostrando aunque el servidor ya publicara la
// nueva. El navegador busca actualizaciones de /sw.js en cada visita: cuando encuentra este
// archivo, lo instala, borra las cachés viejas, se desregistra y recarga las pestañas
// abiertas, que pasan a cargar la app nueva directo del servidor.
//
// La app nueva no registra ningún service worker. Este archivo existe solo para limpiar
// los dispositivos que usaron la versión vieja; se puede borrar cuando ya no quede ninguno.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.map((clave) => caches.delete(clave)));
      await self.registration.unregister();
      const ventanas = await self.clients.matchAll({ type: "window" });
      await Promise.all(ventanas.map((ventana) => ventana.navigate(ventana.url).catch(() => {})));
    })()
  );
});
